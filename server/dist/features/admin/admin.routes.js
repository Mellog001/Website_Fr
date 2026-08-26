"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("./admin.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const admin_validation_1 = require("./admin.validation");
const enums_1 = require("../../types/enums");
const router = (0, express_1.Router)();
const controller = new admin_controller_1.AdminController();
/**
 * List all platform users
 */
router.get('/users', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.ADMIN), controller.listUsers);
/**
 * List tutors waiting for approval
 */
router.get('/tutors/pending', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.ADMIN), controller.listPendingTutors);
/**
 * Approve / verify tutor
 */
router.post('/tutors/:userId/verify', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.ADMIN), controller.verifyTutor);
/**
 * Suspend / activate user
 */
router.post('/users/:userId/suspend', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.ADMIN), (0, validate_1.validate)(admin_validation_1.suspendUserSchema), controller.suspendUser);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map