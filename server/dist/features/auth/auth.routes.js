"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const validate_1 = require("../../common/middleware/validate");
const auth_validation_1 = require("./auth.validation");
const rate_limiter_1 = require("../../common/middleware/rate-limiter");
const router = (0, express_1.Router)();
const controller = new auth_controller_1.AuthController();
router.post('/register', rate_limiter_1.authLimiter, (0, validate_1.validate)(auth_validation_1.registerSchema), controller.register);
router.post('/login', rate_limiter_1.authLimiter, (0, validate_1.validate)(auth_validation_1.loginSchema), controller.login);
router.post('/refresh', (0, validate_1.validate)(auth_validation_1.refreshSchema), controller.refresh);
router.post('/logout', (0, validate_1.validate)(auth_validation_1.refreshSchema), controller.logout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map