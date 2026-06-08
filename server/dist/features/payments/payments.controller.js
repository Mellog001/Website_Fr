"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const mpesa_service_1 = require("./mpesa.service");
const mpesa_1 = require("../../config/mpesa");
const app_error_1 = require("../../common/errors/app-error");
const mpesaService = new mpesa_service_1.MpesaService();
class PaymentsController {
    /**
     * Request STK Push payment trigger for a course
     */
    initiateStkPush = async (req, res, next) => {
        try {
            const { courseId, phoneNumber } = req.body;
            const result = await mpesaService.initiateStkPush(req.user.id, courseId, phoneNumber);
            res.status(200).json({
                status: 'success',
                message: 'Payment dispatch trigger initiated successfully.',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Safaricom Daraja callback webhook processor
     */
    mpesaCallback = async (req, res, next) => {
        const { token } = req.query;
        try {
            // Security Check: Verify secret PassKey token in callback URL handshake
            if (!token || token !== mpesa_1.mpesaConfig.passKey) {
                throw app_error_1.AppError.forbidden('Unauthorized webhook execution request.');
            }
            const result = await mpesaService.processCallback(req.body);
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.PaymentsController = PaymentsController;
exports.default = PaymentsController;
//# sourceMappingURL=payments.controller.js.map