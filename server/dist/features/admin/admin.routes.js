"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("./admin.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const admin_validation_1 = require("./admin.validation");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const controller = new admin_controller_1.AdminController();
// Freeze/suspend student or tutor login accounts
router.post('/users/:userId/suspend', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.ADMIN), (0, validate_1.validate)(admin_validation_1.suspendUserSchema), controller.suspendUser);
// List platform users
router.get('/users', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.ADMIN), controller.listUsers);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map