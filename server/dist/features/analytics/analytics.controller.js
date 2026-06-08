"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const analytics_service_1 = require("./analytics.service");
const analyticsService = new analytics_service_1.AnalyticsService();
class AnalyticsController {
    getAdminStats = async (_req, res, next) => {
        try {
            const result = await analyticsService.getAdminDashboardStats();
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getTutorStats = async (req, res, next) => {
        try {
            const result = await analyticsService.getTutorDashboardStats(req.user.id);
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
exports.AnalyticsController = AnalyticsController;
exports.default = AnalyticsController;
//# sourceMappingURL=analytics.controller.js.map