import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../../types/enums';
import pool from '../../config/database';
import { hashPassword, comparePassword } from '../../common/utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  TokenPayload,
  RefreshTokenPayload
} from '../../common/utils/jwt';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../config/logger';
import { RowDataPacket } from 'mysql2';
import { emailService } from '../../common/services/email.service';

const REFRESH_TOKEN_TTL_DAYS = 7;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
  };
  accessToken?: string;
  refreshToken?: string;
}

export class AuthService {
  /**
   * Register a new Student or Tutor user
   */
  public async register(payload: any): Promise<Pick<AuthResponse, 'user'>> {
    const { email, password, role } = payload;

    // Check if email already registered
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingRows.length > 0) {
      throw AppError.conflict('An account with this email address already exists.');
    }

    const hashedPassword = await hashPassword(password);
    const userId = uuidv4();

    // Create user and profile in a single atomic transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'INSERT INTO users (id, email, password_hash, role, is_email_verified) VALUES (?, ?, ?, ?, ?)',
        [userId, email, hashedPassword, role, false]
      );

      // If user is a TUTOR, initialize their empty profile
      if (role === UserRole.TUTOR) {
        const profileId = uuidv4();
        await connection.execute(
          'INSERT INTO tutor_profiles (id, user_id, competency_status) VALUES (?, ?, ?)',
          [profileId, userId, 'PENDING']
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    logger.info(`👤 New user registered: ${email} (${role})`);

    // Generate Verification Token and Send Email
    const token = await this.generateVerificationToken(userId, 'EMAIL_VERIFICATION', EMAIL_VERIFICATION_TTL_HOURS);
    await emailService.sendVerificationEmail(email, token);

    // Return user without auth tokens because email is not verified yet
    return {
      user: { id: userId, email, role, isEmailVerified: false }
    };
  }

  /**
   * Log in user using email and password
   */
  public async login(payload: any): Promise<AuthResponse> {
    const { email, password } = payload;

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, password_hash, role, is_email_verified FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    const user = rows[0];

    if (!user || !(await comparePassword(password, user.password_hash))) {
      throw AppError.unauthorized('Invalid email or password credentials.');
    }

    if (!user.is_email_verified && user.role !== UserRole.ADMIN) {
      throw AppError.unauthorized('Please verify your email before logging in.');
    }

    logger.info(`🔑 User logged in: ${user.email}`);

    return this.generateAuthSession({ id: user.id, email: user.email, role: user.role, isEmailVerified: user.is_email_verified });
  }

  /**
   * Get Current User Profile
   */
  public async getMe(userId: string): Promise<any> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, role, is_email_verified, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    );

    const user = rows[0];
    if (!user) {
      throw AppError.notFound('User not found.');
    }

    // Convert keys to camelCase for response
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: !!user.is_email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Request Password Reset
   */
  public async forgotPassword(email: string): Promise<void> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    const user = rows[0];
    if (!user) {
      // Do not reveal if the user exists or not
      return;
    }

    const token = await this.generateVerificationToken(user.id, 'PASSWORD_RESET', PASSWORD_RESET_TTL_HOURS);
    await emailService.sendPasswordResetEmail(email, token);
  }

  /**
   * Reset Password Using Token
   */
  public async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.validateAndConsumeToken(token, 'PASSWORD_RESET');
    
    if (!userId) {
      throw AppError.badRequest('Invalid or expired password reset token.');
    }

    const hashedPassword = await hashPassword(newPassword);
    
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    // Revoke all existing sessions to force re-login on all devices
    await this.revokeAllSessions(userId);
    logger.info(`🔐 Password reset successfully for user: ${userId}`);
  }

  /**
   * Change Password (Authenticated User)
   */
  public async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    );

    const user = rows[0];
    if (!user || !(await comparePassword(oldPassword, user.password_hash))) {
      throw AppError.unauthorized('Incorrect old password.');
    }

    const hashedPassword = await hashPassword(newPassword);
    
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    // Revoke all existing sessions to force re-login on all devices
    await this.revokeAllSessions(userId);
    logger.info(`🔐 Password changed successfully for user: ${userId}`);
  }

  /**
   * Verify Email
   */
  public async verifyEmail(token: string): Promise<void> {
    const userId = await this.validateAndConsumeToken(token, 'EMAIL_VERIFICATION');
    
    if (!userId) {
      throw AppError.badRequest('Invalid or expired email verification token.');
    }

    await pool.execute(
      'UPDATE users SET is_email_verified = TRUE WHERE id = ?',
      [userId]
    );

    logger.info(`📧 Email verified successfully for user: ${userId}`);
  }

  /**
   * Resend Verification Email
   */
  public async resendVerificationEmail(email: string): Promise<void> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, is_email_verified FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    const user = rows[0];
    if (!user) {
      return; // Do not reveal if the user exists
    }

    if (user.is_email_verified) {
      throw AppError.badRequest('Email is already verified.');
    }

    const token = await this.generateVerificationToken(user.id, 'EMAIL_VERIFICATION', EMAIL_VERIFICATION_TTL_HOURS);
    await emailService.sendVerificationEmail(email, token);
  }

  /**
   * Rotate access and refresh tokens securely using MySQL token store
   */
  public async refresh(token: string): Promise<Pick<AuthResponse, 'accessToken' | 'refreshToken'>> {
    let decoded: RefreshTokenPayload;

    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      throw AppError.unauthorized('Invalid or expired refresh token signature.');
    }

    const { userId, tokenId } = decoded;

    // Check if refresh token exists and is not expired in MySQL
    const [tokenRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM refresh_tokens WHERE user_id = ? AND token_id = ? AND expires_at > NOW()',
      [userId, tokenId]
    );

    if (tokenRows.length === 0) {
      // ⚠️ REUSE ATTACK DETECTED!
      // Revoke all refresh tokens for this user immediately for extreme safety
      logger.warn(`⚠️ Potential JWT refresh token reuse attack detected for user ${userId}. Revoking token family.`);
      await this.revokeAllSessions(userId);
      throw AppError.unauthorized('Potential session theft detected. All sessions revoked. Please log in again.');
    }

    // Single use token: delete old token from database
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE user_id = ? AND token_id = ?',
      [userId, tokenId]
    );

    // Fetch user
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, role, is_email_verified FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    );

    const user = rows[0];

    if (!user) {
      throw AppError.unauthorized('User session invalid or deleted.');
    }

    if (!user.is_email_verified && user.role !== UserRole.ADMIN) {
      throw AppError.unauthorized('Please verify your email to continue.');
    }

    // Generate new token family
    const newTokenId = crypto.randomUUID();
    const tokenPayload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
    const refreshTokenPayload: RefreshTokenPayload = { userId: user.id, tokenId: newTokenId };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(refreshTokenPayload);

    // Persist new refresh token in MySQL
    await this.storeRefreshToken(user.id, newTokenId);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Log out and revoke active session token
   */
  public async logout(token: string): Promise<void> {
    try {
      const decoded = verifyRefreshToken(token);
      await pool.execute(
        'DELETE FROM refresh_tokens WHERE user_id = ? AND token_id = ?',
        [decoded.userId, decoded.tokenId]
      );
      logger.info(`🚪 Revoked refresh token session: ${decoded.tokenId} for user: ${decoded.userId}`);
    } catch (error) {
      // Fail gracefully on logout
      logger.warn('Failed to parse refresh token during logout.');
    }
  }

  /**
   * Helper: Generate access and refresh tokens and persist refresh token in MySQL
   */
  private async generateAuthSession(user: any): Promise<AuthResponse> {
    const tokenId = crypto.randomUUID();
    const tokenPayload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
    const refreshTokenPayload: RefreshTokenPayload = { userId: user.id, tokenId };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(refreshTokenPayload);

    // Persist refresh token in MySQL (7-day expiration)
    await this.storeRefreshToken(user.id, tokenId);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Helper: Insert a new refresh token record into MySQL with 7-day TTL
   */
  private async storeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await pool.execute(
      'INSERT INTO refresh_tokens (id, user_id, token_id, expires_at) VALUES (?, ?, ?, ?)',
      [id, userId, tokenId, expiresAt]
    );
  }

  /**
   * Helper: Generate a verification token for email verification or password reset
   */
  private async generateVerificationToken(userId: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET', ttlHours: number): Promise<string> {
    // Revoke previous tokens of the same type for this user
    await pool.execute(
      'DELETE FROM verification_tokens WHERE user_id = ? AND type = ?',
      [userId, type]
    );

    const id = uuidv4();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO verification_tokens (id, user_id, token, type, expires_at) VALUES (?, ?, ?, ?, ?)',
      [id, userId, hashedToken, type, expiresAt]
    );

    // Return the raw token to be sent to the user
    return rawToken;
  }

  /**
   * Helper: Validate a verification token and return the associated user ID.
   * Consumes (deletes) the token if valid.
   */
  private async validateAndConsumeToken(rawToken: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<string | null> {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, user_id FROM verification_tokens WHERE token = ? AND type = ? AND expires_at > NOW()',
      [hashedToken, type]
    );

    if (rows.length === 0) {
      return null;
    }

    const { id, user_id } = rows[0];

    // Consume the token
    await pool.execute('DELETE FROM verification_tokens WHERE id = ?', [id]);

    return user_id;
  }

  /**
   * Helper: Revoke all active refresh tokens for a user (instant full session invalidation)
   */
  private async revokeAllSessions(userId: string): Promise<void> {
    await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    logger.info(`🔐 All active sessions revoked for user: ${userId}`);
  }
}

export default AuthService;
