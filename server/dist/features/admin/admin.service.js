"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const enums_1 = require("../../types/enums");
const database_1 = __importDefault(require("../../config/database"));
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
class AdminService {
    /**
     * List all registered platform users
     */
    async listUsers(role, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const conditions = [];
        const params = [];
        if (role) {
            conditions.push('u.role = ?');
            params.push(role);
        }
        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';
        const [countRows] = await database_1.default.execute(`SELECT COUNT(*) AS total
       FROM users u
       ${whereClause}`, params);
        const total = Number(countRows[0].total);
        const [users] = await database_1.default.execute(`SELECT
          u.id,
          u.email,
          u.role,
          u.is_email_verified,
          u.created_at,
          u.deleted_at,
          tp.id AS tutor_profile_id,
          tp.is_verified AS tutor_verified
       FROM users u
       LEFT JOIN tutor_profiles tp
         ON tp.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`, [...params, limit, skip]);
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
    /**
     * List tutors waiting for administrator approval
     *
     * A tutor must:
     * 1. Have role TUTOR
     * 2. Have verified their email
     * 3. Not already be administrator verified
     * 4. Not be suspended
     */
    async listPendingTutors() {
        const [rows] = await database_1.default.execute(`SELECT
          u.id AS user_id,
          u.email,
          u.created_at,
          u.is_email_verified,
          tp.id AS tutor_profile_id,
          tp.bio,
          tp.competency_status,
          tp.is_verified
       FROM users u
       INNER JOIN tutor_profiles tp
         ON tp.user_id = u.id
       WHERE u.role = ?
         AND u.is_email_verified = 1
         AND tp.is_verified = 0
         AND u.deleted_at IS NULL
       ORDER BY u.created_at ASC`, [enums_1.UserRole.TUTOR]);
        return rows;
    }
    /**
     * Approve / verify a tutor
     */
    async verifyTutor(adminUserId, tutorUserId) {
        const [rows] = await database_1.default.execute(`SELECT
          u.id,
          u.email,
          u.role,
          u.is_email_verified,
          tp.id AS tutor_profile_id,
          tp.is_verified
       FROM users u
       INNER JOIN tutor_profiles tp
         ON tp.user_id = u.id
       WHERE u.id = ?
         AND u.role = ?
         AND u.deleted_at IS NULL`, [tutorUserId, enums_1.UserRole.TUTOR]);
        const tutor = rows[0];
        if (!tutor) {
            throw app_error_1.AppError.notFound('Tutor account not found.');
        }
        if (tutor.is_verified) {
            throw app_error_1.AppError.badRequest('This tutor is already verified.');
        }
        if (!tutor.is_email_verified) {
            throw app_error_1.AppError.badRequest('Tutor must verify their email address before administrator approval.');
        }
        await database_1.default.execute(`UPDATE tutor_profiles
   SET
     is_verified = 1,
     verified_at = NOW(),
     verified_by_id = ?
   WHERE user_id = ?`, [adminUserId, tutorUserId]);
        const [updatedRows] = await database_1.default.execute(`SELECT
          u.id,
          u.email,
          u.role,
          u.is_email_verified,
          tp.id AS tutor_profile_id,
          tp.is_verified
       FROM users u
       INNER JOIN tutor_profiles tp
         ON tp.user_id = u.id
       WHERE u.id = ?`, [tutorUserId]);
        logger_1.logger.info(`Tutor ${tutor.email} [ID: ${tutorUserId}] verified by Admin ${adminUserId}`);
        return updatedRows[0];
    }
    /**
     * Suspend or activate user login
     */
    async suspendUser(adminUserId, targetUserId, isSuspended) {
        const [targetRows] = await database_1.default.execute(`SELECT id, email, role
       FROM users
       WHERE id = ?`, [targetUserId]);
        const target = targetRows[0];
        if (!target) {
            throw app_error_1.AppError.notFound('Target user not found.');
        }
        if (adminUserId === targetUserId) {
            throw app_error_1.AppError.badRequest('You cannot suspend your own administrative account.');
        }
        await database_1.default.execute(`UPDATE users
       SET deleted_at = ?
       WHERE id = ?`, [
            isSuspended ? new Date() : null,
            targetUserId
        ]);
        const [updatedRows] = await database_1.default.execute(`SELECT
          id,
          email,
          role,
          deleted_at
       FROM users
       WHERE id = ?`, [targetUserId]);
        logger_1.logger.info(`USER SUSPENSION: User ${target.email} [ID: ${targetUserId}] ` +
            `status set to Suspended=${isSuspended} by Admin: ${adminUserId}`);
        return updatedRows[0];
    }
}
exports.AdminService = AdminService;
exports.default = AdminService;
//# sourceMappingURL=admin.service.js.map