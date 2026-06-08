"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payments_controller_1 = require("./payments.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const payments_validation_1 = require("./payments.validation");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const controller = new payments_controller_1.PaymentsController();
// Trigger an STK Push to complete purchase (Student only)
router.post('/stk-push', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.STUDENT), (0, validate_1.validate)(payments_validation_1.initiateStkPushSchema), controller.initiateStkPush);
// Safaricom Webhook callback parser (Publicly exposed but token-secured)
router.post('/mpesa-callback', controller.mpesaCallback);
exports.default = router;
//# sourceMappingURL=payments.routes.js.map