"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const validate_1 = require("../../common/middleware/validate");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const auth_validation_1 = require("./auth.validation");
const rate_limiter_1 = require("../../common/middleware/rate-limiter");
const router = (0, express_1.Router)();
const controller = new auth_controller_1.AuthController();
// Public Authentication
router.post('/register', rate_limiter_1.authLimiter, (0, validate_1.validate)(auth_validation_1.registerSchema), controller.register);
router.post('/login', rate_limiter_1.authLimiter, (0, validate_1.validate)(auth_validation_1.loginSchema), controller.login);
router.post('/refresh', (0, validate_1.validate)(auth_validation_1.refreshSchema), controller.refresh);
router.post('/logout', (0, validate_1.validate)(auth_validation_1.refreshSchema), controller.logout);
// Email Verification
router.post('/verify-email', (0, validate_1.validate)(auth_validation_1.verifyEmailSchema), controller.verifyEmail);
router.post('/resend-verification', rate_limiter_1.authLimiter, (0, validate_1.validate)(auth_validation_1.resendVerificationSchema), controller.resendVerificationEmail);
// Password Management (Public - Reset Flow)
router.post('/forgot-password', rate_limiter_1.authLimiter, (0, validate_1.validate)(auth_validation_1.forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', rate_limiter_1.authLimiter, (0, validate_1.validate)(auth_validation_1.resetPasswordSchema), controller.resetPassword);
// Password Management (Protected - Change Password)
router.put('/change-password', auth_middleware_1.authenticate, (0, validate_1.validate)(auth_validation_1.changePasswordSchema), controller.changePassword);
// Profile Inspection
router.get('/me', auth_middleware_1.authenticate, controller.getMe);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map