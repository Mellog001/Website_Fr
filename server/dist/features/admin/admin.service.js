"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const prisma_1 = require("../../config/prisma");
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
class AdminService {
    /**
     * Suspend (freeze) or activate user logins
     */
    async suspendUser(adminUserId, targetUserId, isSuspended) {
        const target = await prisma_1.prisma.user.findUnique({
            where: { id: targetUserId },
        });
        if (!target) {
            throw app_error_1.AppError.notFound('Target user not found.');
        }
        if (adminUserId === targetUserId) {
            throw app_error_1.AppError.badRequest('You cannot suspend your own administrative account.');
        }
        // Set deletedAt value (soft-delete filters will block access on true)
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: targetUserId },
            data: {
                deletedAt: isSuspended ? new Date() : null,
            },
            select: {
                id: true,
                email: true,
                role: true,
                deletedAt: true,
            },
        });
        logger_1.logger.info(`🛡️ USER SUSPENSION: User ${target.email} [ID: ${targetUserId}] status set to Suspended=${isSuspended} by Admin: ${adminUserId}`);
        return updatedUser;
    }
    /**
     * List all registered platform users
     */
    async listUsers(role, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const filter = {};
        if (role) {
            filter.role = role;
        }
        const [total, users] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.count({ where: filter }),
            prisma_1.prisma.user.findMany({
                where: filter,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    deletedAt: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
        ]);
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