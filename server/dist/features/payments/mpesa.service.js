"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MpesaService = void 0;
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const enums_1 = require("../../types/enums");
const mpesa_1 = require("../../config/mpesa");
const database_1 = __importDefault(require("../../config/database"));
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
        const [courseRows] = await database_1.default.execute('SELECT id, title, price FROM courses WHERE id = ?', [courseId]);
        const course = courseRows[0];
        if (!course) {
            throw app_error_1.AppError.notFound('Course not found.');
        }
        if (Number(course.price) === 0) {
            throw app_error_1.AppError.badRequest('This course is free. Use direct enrollment.');
        }
        // Verify if already enrolled
        const [enrollmentRows] = await database_1.default.execute('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [userId, courseId]);
        if (enrollmentRows.length > 0) {
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
            const paymentId = (0, uuid_1.v4)();
            await database_1.default.execute(`INSERT INTO payments (id, student_id, course_id, amount, status, checkout_request_id, merchant_request_id, phone_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [paymentId, userId, courseId, course.price, enums_1.PaymentStatus.PENDING, CheckoutRequestID, MerchantRequestID, formattedPhone]);
            // Schedule an automated reconciliation check in BullMQ after 10 minutes in case callback fails
            await queues_1.paymentQueue.add('reconcile-payment', { paymentId }, { delay: 10 * 60 * 1000 } // 10 minutes
            );
            logger_1.logger.info(`💸 STK Push initiated for Student: ${userId} -> CheckoutRequestID: ${CheckoutRequestID}`);
            return {
                message: CustomerMessage || 'STK Push sent. Please check your handset to complete payment.',
                paymentId,
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
        const [paymentRows] = await database_1.default.execute('SELECT * FROM payments WHERE checkout_request_id = ?', [CheckoutRequestID]);
        const payment = paymentRows[0];
        if (!payment) {
            logger_1.logger.warn(`⚠️ Callback received for untracked checkout ID: ${CheckoutRequestID}`);
            return { status: 'ignored' };
        }
        // Skip processing if already finalized (idempotency guard)
        if (payment.status !== enums_1.PaymentStatus.PENDING) {
            logger_1.logger.info(`Payment record ${payment.id} already settled with status ${payment.status}. Ignoring callback.`);
            return { status: 'already_settled' };
        }
        if (ResultCode === 0) {
            // SUCCESSFUL TRANSACTION
            const metadataItems = callbackData.CallbackMetadata?.Item || [];
            const getVal = (name) => metadataItems.find((item) => item.Name === name)?.Value;
            const mpesaReceiptNumber = getVal('MpesaReceiptNumber');
            // Perform atomic database update: mark payment settled & auto enroll student
            const connection = await database_1.default.getConnection();
            try {
                await connection.beginTransaction();
                // 1. Mark payment as SUCCESSFUL
                await connection.execute('UPDATE payments SET status = ?, mpesa_receipt_number = ?, paid_at = NOW() WHERE id = ?', [enums_1.PaymentStatus.SUCCESSFUL, String(mpesaReceiptNumber), payment.id]);
                // 2. Create enrollment record
                const enrollmentId = (0, uuid_1.v4)();
                await connection.execute('INSERT INTO enrollments (id, student_id, course_id, status, progress) VALUES (?, ?, ?, ?, ?)', [enrollmentId, payment.student_id, payment.course_id, enums_1.EnrollmentStatus.ACTIVE, 0.0]);
                // 3. Link enrollment to payment record
                await connection.execute('UPDATE payments SET enrollment_id = ? WHERE id = ?', [enrollmentId, payment.id]);
                await connection.commit();
                logger_1.logger.info(`✅ Successfully settled payment ${payment.id} & enrolled Student: ${payment.student_id} in Course: ${payment.course_id}`);
            }
            catch (error) {
                await connection.rollback();
                throw error;
            }
            finally {
                connection.release();
            }
            return { status: 'success' };
        }
        else {
            // TRANSACTION CANCELLED / FAILED
            await database_1.default.execute('UPDATE payments SET status = ? WHERE id = ?', [enums_1.PaymentStatus.FAILED, payment.id]);
            logger_1.logger.info(`❌ Payment ${payment.id} marked as FAILED. Reason: ${ResultDesc}`);
            return { status: 'failed', reason: ResultDesc };
        }
    }
    /**
     * Query Safaricom status to reconcile a payment (Reconciliation Service)
     */
    async reconcilePayment(paymentId) {
        const [paymentRows] = await database_1.default.execute('SELECT * FROM payments WHERE id = ?', [paymentId]);
        const payment = paymentRows[0];
        if (!payment) {
            logger_1.logger.error(`Reconciliation failed: Payment ${paymentId} not found.`);
            return;
        }
        if (payment.status !== enums_1.PaymentStatus.PENDING) {
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
            CheckoutRequestID: payment.checkout_request_id,
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
                        MerchantRequestID: payment.merchant_request_id,
                        CheckoutRequestID: payment.checkout_request_id,
                        ResultCode: Number(ResultCode),
                        ResultDesc,
                        CallbackMetadata: {
                            Item: [
                                { Name: 'MpesaReceiptNumber', Value: `RECON-${payment.checkout_request_id.slice(0, 5)}` },
                                { Name: 'Amount', Value: payment.amount },
                                { Name: 'PhoneNumber', Value: payment.phone_number },
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
            await database_1.default.execute('UPDATE payments SET status = ? WHERE id = ?', [enums_1.PaymentStatus.FAILED, paymentId]);
        }
    }
}
exports.MpesaService = MpesaService;
exports.default = MpesaService;
//# sourceMappingURL=mpesa.service.js.map