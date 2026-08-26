import { UserRole } from '../../types/enums';
import pool from '../../config/database';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../config/logger';
import { RowDataPacket } from 'mysql2';

export class AdminService {

  /**
   * List all registered platform users
   */
  public async listUsers(
    role?: UserRole,
    page: number = 1,
    limit: number = 20
  ) {
    // Make sure pagination values are always valid integers
    page = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    limit = Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), 100)
      : 20;

    const skip = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (role) {
      conditions.push('u.role = ?');
      params.push(role);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    // Count users
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM users u
       ${whereClause}`,
      params
    );

    const total = Number(countRows[0]?.total || 0);

    /*
     * Do not bind LIMIT/OFFSET through the prepared statement.
     * Build them from validated integers instead.
     */
    const [users] = await pool.execute<RowDataPacket[]>(
      `SELECT
          u.id,
          u.email,
          u.role,
          u.is_email_verified AS email_verified,
          u.created_at,
          u.deleted_at,
          tp.id AS tutor_profile_id,
          tp.is_verified AS tutor_verified
       FROM users u
       LEFT JOIN tutor_profiles tp
         ON tp.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ${limit} OFFSET ${skip}`,
      params
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


  /**
   * List tutors waiting for administrator approval
   */
  public async listPendingTutors() {

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
          u.id AS user_id,
          u.email,
          u.created_at,
          u.is_email_verified AS email_verified,
          tp.id AS tutor_profile_id,
          tp.bio,
          tp.is_verified,
          tp.competency_score,
          tp.competency_status
       FROM users u
       INNER JOIN tutor_profiles tp
         ON tp.user_id = u.id
       WHERE u.role = ?
         AND tp.is_verified = 0
         AND u.deleted_at IS NULL
       ORDER BY u.created_at ASC`,
      [UserRole.TUTOR]
    );

    return rows;
  }


  /**
   * Approve / verify a tutor
   */
  public async verifyTutor(
    adminUserId: string,
    tutorUserId: string
  ) {

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
          u.id,
          u.email,
          u.role,
          u.is_email_verified AS email_verified,
          tp.id AS tutor_profile_id,
          tp.is_verified
       FROM users u
       INNER JOIN tutor_profiles tp
         ON tp.user_id = u.id
       WHERE u.id = ?
         AND u.role = ?`,
      [tutorUserId, UserRole.TUTOR]
    );

    const tutor = rows[0];

    if (!tutor) {
      throw AppError.notFound('Tutor account not found.');
    }

    if (tutor.is_verified) {
      throw AppError.badRequest('This tutor is already verified.');
    }

    /*
     * Tutor must verify their email before admin approval.
     */
    if (!tutor.email_verified) {
      throw AppError.badRequest(
        'Tutor must verify their email address before administrator approval.'
      );
    }

    /*
     * Mark tutor as verified and record who approved them.
     */
    await pool.execute(
      `UPDATE tutor_profiles
       SET
         is_verified = 1,
         verified_at = NOW(),
         verified_by_id = ?
       WHERE user_id = ?`,
      [adminUserId, tutorUserId]
    );

    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
          u.id,
          u.email,
          u.role,
          u.is_email_verified AS email_verified,
          tp.id AS tutor_profile_id,
          tp.is_verified,
          tp.verified_at,
          tp.verified_by_id
       FROM users u
       INNER JOIN tutor_profiles tp
         ON tp.user_id = u.id
       WHERE u.id = ?`,
      [tutorUserId]
    );

    logger.info(
      `Tutor ${tutor.email} [ID: ${tutorUserId}] verified by Admin ${adminUserId}`
    );

    return updatedRows[0];
  }


  /**
   * Suspend or activate user login
   */
  public async suspendUser(
    adminUserId: string,
    targetUserId: string,
    isSuspended: boolean
  ) {

    const [targetRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, email, role
       FROM users
       WHERE id = ?`,
      [targetUserId]
    );

    const target = targetRows[0];

    if (!target) {
      throw AppError.notFound('Target user not found.');
    }

    /*
     * Prevent administrator from suspending themselves.
     */
    if (adminUserId === targetUserId) {
      throw AppError.badRequest(
        'You cannot suspend your own administrative account.'
      );
    }

    await pool.execute(
      `UPDATE users
       SET deleted_at = ?
       WHERE id = ?`,
      [isSuspended ? new Date() : null, targetUserId]
    );

    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
          id,
          email,
          role,
          deleted_at
       FROM users
       WHERE id = ?`,
      [targetUserId]
    );

    logger.info(
      `USER SUSPENSION: User ${target.email} [ID: ${targetUserId}] ` +
      `status set to Suspended=${isSuspended} by Admin: ${adminUserId}`
    );

    return updatedRows[0];
  }
}

export default AdminService;