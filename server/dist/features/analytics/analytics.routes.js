"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("./analytics.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const enums_1 = require("../../types/enums");
const router = (0, express_1.Router)();
const controller = new analytics_controller_1.AnalyticsController();
// Admin-level dashboard metrics (system-wide summaries)
router.get('/admin', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.ADMIN), controller.getAdminStats);
// Tutor-level earnings and students enrollments statistics
router.get('/tutor', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.TUTOR), controller.getTutorStats);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map