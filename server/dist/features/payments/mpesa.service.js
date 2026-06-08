"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MpesaService = void 0;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const mpesa_1 = require("../../config/mpesa");
const prisma_1 = require("../../config/prisma");
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
const queues_1 = require("../../jobs/queues");
// Cache credentials to save S1 API request limits
let cachedToken = '';
let cachedTokenExpiry = 0;
class MpesaService {
    /**
     * Fetch Safaricom Daraja OAuth Token with caching
     */
    async getOAuthToken() {
        const now = Date.now();
        if (cachedToken && now < cachedTokenExpiry) {
            return cachedToken;
        }
        const credentials = Buffer.from(`${mpesa_1.mpesaConfig.consumerKey}:${mpesa_1.mpesaConfig.consumerSecret}`).toString('base64');
        try {
            const response = await axios_1.default.get(`${mpesa_1.mpesaConfig.baseUrl}${mpesa_1.mpesaConfig.oauthEndpoint}`, {
                headers: {
                    Authorization: `Basic ${credentials}`,
                },
            });
            const { access_token, expires_in } = response.data;
            cachedToken = access_token;
            // Expire token slightly earlier (1 minute buffer) than the returned value
            cachedTokenExpiry = now + (Number(expires_in) - 60) * 1000;
            logger_1.logger.info('🔑 Refreshed Safaricom Daraja OAuth token.');
            return cachedToken;
        }
        catch (error) {
            logger_1.logger.error('Failed to get Daraja OAuth token:', error.response?.data || error.message);
            throw app_error_1.AppError.internal('M-Pesa authorization failure.');
        }
    }
    /**
     * Format Phone Number to Safaricom's standard: 2547XXXXXXXX
     */
    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/\+/g, '').trim();
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.slice(1);
        }
        else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
            cleaned = '254' + cleaned;
        }
        return cleaned;
    }
    /**
     * Initiate STK Push Payment request
     */
    async initiateStkPush(userId, courseId, phone) {
        const formattedPhone = this.formatPhoneNumber(phone);
        // Fetch Course details
        const course = await prisma_1.prisma.course.findUnique({
            where: { id: courseId },
        });
        if (!course) {
            throw app_error_1.AppError.notFound('Course not found.');
        }
        if (course.price.isZero()) {
            throw app_error_1.AppError.badRequest('This course is free. Use direct enrollment.');
        }
        // Verify if already enrolled
        const existingEnrollment = await prisma_1.prisma.enrollment.findUnique({
            where: {
                studentId_courseId: { studentId: userId, courseId },
            },
        });
        if (existingEnrollment) {
            throw app_error_1.AppError.conflict('You are already enrolled in this course.');
        }
        // Generate Request parameters
        const token = await this.getOAuthToken();
        const timestamp = new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0, 14); // YYYYMMDDHHmmss
        const password = Buffer.from(`${mpesa_1.mpesaConfig.shortCode}${mpesa_1.mpesaConfig.passKey}${timestamp}`).toString('base64');
        const amount = Math.round(Number(course.price));
        // Webhook callback url protected with security token
        const secureCallbackUrl = `${mpesa_1.mpesaConfig.callbackUrl}?token=${mpesa_1.mpesaConfig.passKey}`;
        const requestBody = {
            BusinessShortCode: mpesa_1.mpesaConfig.shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: mpesa_1.mpesaConfig.shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: secureCallbackUrl,
            AccountReference: course.title.slice(0, 12).replace(/[^a-zA-Z0-9]/g, ''),
            TransactionDesc: `Payment for course: ${course.title}`.slice(0, 20),
        };
        try {
            const response = await axios_1.default.post(`${mpesa_1.mpesaConfig.baseUrl}${mpesa_1.mpesaConfig.stkPushTriggerEndpoint}`, requestBody, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const { ResponseCode, CheckoutRequestID, MerchantRequestID, CustomerMessage } = response.data;
            if (ResponseCode !== '0') {
                throw app_error_1.AppError.badRequest('Daraja STK Push dispatch rejected by Safaricom.');
            }
            // Log transaction record in database
            const payment = await prisma_1.prisma.payment.create({
                data: {
                    studentId: userId,
                    courseId: courseId,
                    amount: course.price,
                    status: client_1.PaymentStatus.PENDING,
                    checkoutRequestId: CheckoutRequestID,
                    merchantRequestId: MerchantRequestID,
                    phoneNumber: formattedPhone,
                },
            });
            // Schedule an automated reconciliation check in BullMQ after 10 minutes in case callback fails
            await queues_1.paymentQueue.add('reconcile-payment', { paymentId: payment.id }, { delay: 10 * 60 * 1000 } // 10 minutes
            );
            logger_1.logger.info(`💸 STK Push initiated for Student: ${userId} -> CheckoutRequestID: ${CheckoutRequestID}`);
            return {
                message: CustomerMessage || 'STK Push sent. Please check your handset to complete payment.',
                paymentId: payment.id,
                checkoutRequestId: CheckoutRequestID,
            };
        }
        catch (error) {
            logger_1.logger.error('Daraja STK Push error dispatching:', error.response?.data || error.message);
            throw app_error_1.AppError.internal('Failed to dispatch M-Pesa STK Push payment trigger.');
        }
    }
    /**
     * Safaricom Webhook Callback Handler
     */
    async processCallback(payload) {
        const callbackData = payload.Body?.stkCallback;
        if (!callbackData) {
            throw app_error_1.AppError.badRequest('Invalid M-Pesa webhook payload format.');
        }
        const { CheckoutRequestID, ResultCode, ResultDesc } = callbackData;
        logger_1.logger.info(`Webhook payment response received -> CheckoutRequestID: ${CheckoutRequestID} | ResultCode: ${ResultCode}`);
        // Fetch corresponding payment record
        const payment = await prisma_1.prisma.payment.findUnique({
            where: { checkoutRequestId: CheckoutRequestID },
        });
        if (!payment) {
            logger_1.logger.warn(`⚠️ Callback received for untracked checkout ID: ${CheckoutRequestID}`);
            return { status: 'ignored' };
        }
        // Skip processing if already finalized (idempotency guard)
        if (payment.status !== client_1.PaymentStatus.PENDING) {
            logger_1.logger.info(`Payment record ${payment.id} already settled with status ${payment.status}. Ignoring callback.`);
            return { status: 'already_settled' };
        }
        if (ResultCode === 0) {
            // SUCCESSFUL TRANSACTION
            const metadataItems = callbackData.CallbackMetadata?.Item || [];
            const getVal = (name) => metadataItems.find((item) => item.Name === name)?.Value;
            const mpesaReceiptNumber = getVal('MpesaReceiptNumber');
            // Perform atomic database update: mark payment settled & auto enroll student
            await prisma_1.prisma.$transaction(async (tx) => {
                // 1. Mark payment as SUCCESSFUL
                await tx.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: client_1.PaymentStatus.SUCCESSFUL,
                        mpesaReceiptNumber: String(mpesaReceiptNumber),
                        paidAt: new Date(),
                    },
                });
                // 2. Create enrollment record
                const enrollment = await tx.enrollment.create({
                    data: {
                        studentId: payment.studentId,
                        courseId: payment.courseId,
                        status: client_1.EnrollmentStatus.ACTIVE,
                        progress: 0.0,
                    },
                });
                // 3. Link enrollment to payment record
                await tx.payment.update({
                    where: { id: payment.id },
                    data: { enrollmentId: enrollment.id },
                });
                logger_1.logger.info(`✅ Successfully settled payment ${payment.id} & enrolled Student: ${payment.studentId} in Course: ${payment.courseId}`);
            });
            return { status: 'success' };
        }
        else {
            // TRANSACTION CANCELLED / FAILED
            await prisma_1.prisma.payment.update({
                where: { id: payment.id },
                data: { status: client_1.PaymentStatus.FAILED },
            });
            logger_1.logger.info(`❌ Payment ${payment.id} marked as FAILED. Reason: ${ResultDesc}`);
            return { status: 'failed', reason: ResultDesc };
        }
    }
    /**
     * Query Safaricom status to reconcile a payment (Reconciliation Service)
     */
    async reconcilePayment(paymentId) {
        const payment = await prisma_1.prisma.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment) {
            logger_1.logger.error(`Reconciliation failed: Payment ${paymentId} not found.`);
            return;
        }
        if (payment.status !== client_1.PaymentStatus.PENDING) {
            return; // Already settled
        }
        logger_1.logger.info(`🔄 Running payment reconciliation query for Payment ID: ${paymentId}`);
        const token = await this.getOAuthToken();
        const timestamp = new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
        const password = Buffer.from(`${mpesa_1.mpesaConfig.shortCode}${mpesa_1.mpesaConfig.passKey}${timestamp}`).toString('base64');
        const requestBody = {
            BusinessShortCode: mpesa_1.mpesaConfig.shortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: payment.checkoutRequestId,
        };
        try {
            const response = await axios_1.default.post(`${mpesa_1.mpesaConfig.baseUrl}${mpesa_1.mpesaConfig.stkPushQueryEndpoint}`, requestBody, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const { ResultCode, ResultDesc } = response.data;
            // Mock/Format Safaricom query structure to pass to callback processor
            const callbackMock = {
                Body: {
                    stkCallback: {
                        MerchantRequestID: payment.merchantRequestId,
                        CheckoutRequestID: payment.checkoutRequestId,
                        ResultCode: Number(ResultCode),
                        ResultDesc,
                        CallbackMetadata: {
                            Item: [
                                { Name: 'MpesaReceiptNumber', Value: `RECON-${payment.checkoutRequestId.slice(0, 5)}` },
                                { Name: 'Amount', Value: payment.amount },
                                { Name: 'PhoneNumber', Value: payment.phoneNumber },
                            ],
                        },
                    },
                },
            };
            await this.processCallback(callbackMock);
            logger_1.logger.info(`✅ Reconciled payment ${paymentId} successfully.`);
        }
        catch (error) {
            // Safaricom sends 404/500 if transaction not found (indicates transaction was cancelled or never typed PIN)
            logger_1.logger.warn(`Failed querying Safaricom query API for payment ${paymentId}. Setting status to FAILED. Message: ${error.message}`);
            await prisma_1.prisma.payment.update({
                where: { id: paymentId },
                data: { status: client_1.PaymentStatus.FAILED },
            });
        }
    }
}
exports.MpesaService = MpesaService;
exports.default = MpesaService;
//# sourceMappingURL=mpesa.service.js.map