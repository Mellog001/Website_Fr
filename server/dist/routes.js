"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./features/auth/auth.routes"));
const tutors_routes_1 = __importDefault(require("./features/tutors/tutors.routes"));
const courses_routes_1 = __importDefault(require("./features/courses/courses.routes"));
const storage_routes_1 = __importDefault(require("./features/storage/storage.routes"));
const assessments_routes_1 = __importDefault(require("./features/assessments/assessments.routes"));
const payments_routes_1 = __importDefault(require("./features/payments/payments.routes"));
const admin_routes_1 = __importDefault(require("./features/admin/admin.routes"));
const analytics_routes_1 = __importDefault(require("./features/analytics/analytics.routes"));
const rootRouter = (0, express_1.Router)();
rootRouter.use('/auth', auth_routes_1.default);
rootRouter.use('/tutors', tutors_routes_1.default);
rootRouter.use('/courses', courses_routes_1.default);
rootRouter.use('/storage', storage_routes_1.default);
rootRouter.use('/assessments', assessments_routes_1.default);
rootRouter.use('/payments', payments_routes_1.default);
rootRouter.use('/admin', admin_routes_1.default);
rootRouter.use('/analytics', analytics_routes_1.default);
exports.default = rootRouter;
//# sourceMappingURL=routes.js.map