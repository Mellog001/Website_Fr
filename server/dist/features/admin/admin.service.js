"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
class AdminService {
    /**
     * Suspend (freeze) or activate user logins
     */
    async suspendUser(adminUserId, targetUserId, isSuspended) {
        const [targetRows] = await database_1.default.execute('SELECT id, email, role FROM users WHERE id = ?', [targetUserId]);
        const target = targetRows[0];
        if (!target) {
            throw app_error_1.AppError.notFound('Target user not found.');
        }
        if (adminUserId === targetUserId) {
            throw app_error_1.AppError.badRequest('You cannot suspend your own administrative account.');
        }
        // Set deletedAt value (soft-delete filters will block access on true)
        await database_1.default.execute('UPDATE users SET deleted_at = ? WHERE id = ?', [isSuspended ? new Date() : null, targetUserId]);
        const [updatedRows] = await database_1.default.execute('SELECT id, email, role, deleted_at FROM users WHERE id = ?', [targetUserId]);
        logger_1.logger.info(`🛡️ USER SUSPENSION: User ${target.email} [ID: ${targetUserId}] status set to Suspended=${isSuspended} by Admin: ${adminUserId}`);
        return updatedRows[0];
    }
    /**
     * List all registered platform users
     */
    async listUsers(role, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const conditions = [];
        const params = [];
        if (role) {
            conditions.push('role = ?');
            params.push(role);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const [countRows] = await database_1.default.execute(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params);
        const total = countRows[0].total;
        const [users] = await database_1.default.execute(`SELECT id, email, role, created_at, deleted_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, skip]);
        return {
            users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
exports.AdminService = AdminService;
exports.default = AdminService;
//# sourceMappingURL=admin.service.js.map