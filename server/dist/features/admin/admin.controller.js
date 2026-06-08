"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("./admin.service");
const adminService = new admin_service_1.AdminService();
class AdminController {
    suspendUser = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { isSuspended } = req.body;
            const result = await adminService.suspendUser(req.user.id, userId, isSuspended);
            res.status(200).json({
                status: 'success',
                message: `User login suspension set to ${isSuspended} successfully`,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    listUsers = async (req, res, next) => {
        try {
            const { role, page, limit } = req.query;
            const result = await adminService.listUsers(role, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
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
exports.AdminController = AdminController;
exports.default = AdminController;
//# sourceMappingURL=admin.controller.js.map