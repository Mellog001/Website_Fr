import { UserRole } from '../../types/enums';
import pool from '../../config/database';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../config/logger';
import { RowDataPacket } from 'mysql2';

export class AdminService {
  /**
   * Suspend (freeze) or activate user logins
   */
  public async suspendUser(adminUserId: string, targetUserId: string, isSuspended: boolean) {
    const [targetRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, role FROM users WHERE id = ?',
      [targetUserId]
    );

    const target = targetRows[0];
    if (!target) {
      throw AppError.notFound('Target user not found.');
    }

    if (adminUserId === targetUserId) {
      throw AppError.badRequest('You cannot suspend your own administrative account.');
    }

    // Set deletedAt value (soft-delete filters will block access on true)
    await pool.execute(
      'UPDATE users SET deleted_at = ? WHERE id = ?',
      [isSuspended ? new Date() : null, targetUserId]
    );

    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, role, deleted_at FROM users WHERE id = ?',
      [targetUserId]
    );

    logger.info(
      `🛡️ USER SUSPENSION: User ${target.email} [ID: ${targetUserId}] status set to Suspended=${isSuspended} by Admin: ${adminUserId}`
    );

    return updatedRows[0];
  }

  /**
   * List all registered platform users
   */
  public async listUsers(role?: UserRole, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM users ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [users] = await pool.execute<RowDataPacket[]>(
      `SELECT id, email, role, created_at, deleted_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, skip]
    );

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

export default AdminService;
