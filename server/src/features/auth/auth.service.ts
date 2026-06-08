import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../../types/enums';
import pool from '../../config/database';
import { redisConnection } from '../../config/redis';
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

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new Student or Tutor user
   */
  public async register(payload: any): Promise<AuthResponse> {
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
        'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [userId, email, hashedPassword, role]
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

    const user = { id: userId, email, role };
    logger.info(`👤 New user registered: ${user.email} (${user.role})`);

    return this.generateAuthSession(user);
  }

  /**
   * Log in user using email and password
   */
  public async login(payload: any): Promise<AuthResponse> {
    const { email, password } = payload;

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, password_hash, role FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    const user = rows[0];

    if (!user || !(await comparePassword(password, user.password_hash))) {
      throw AppError.unauthorized('Invalid email or password credentials.');
    }

    logger.info(`🔑 User logged in: ${user.email}`);

    return this.generateAuthSession({ id: user.id, email: user.email, role: user.role });
  }

  /**
   * Rotate access and refresh tokens securely
   */
  public async refresh(token: string): Promise<Pick<AuthResponse, 'accessToken' | 'refreshToken'>> {
    let decoded: RefreshTokenPayload;

    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      throw AppError.unauthorized('Invalid or expired refresh token signature.');
    }

    const { userId, tokenId } = decoded;

    const redisKey = `refresh_token:${userId}:${tokenId}`;
    const tokenExists = await redisConnection.get(redisKey);

    if (!tokenExists) {
      // ⚠️ REUSE ATTACK DETECTED!
      // Revoke all refresh tokens for this user immediately for extreme safety
      logger.warn(`⚠️ Potential JWT refresh token reuse attack detected for user ${userId}. Revoking token family.`);
      await this.revokeAllSessions(userId);
      throw AppError.unauthorized('Potential session theft detected. All sessions revoked. Please log in again.');
    }

    // Single use token: delete old token from Redis
    await redisConnection.del(redisKey);

    // Fetch user
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, role FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    );

    const user = rows[0];

    if (!user) {
      throw AppError.unauthorized('User session invalid or deleted.');
    }

    // Generate new family
    const newTokenId = crypto.randomUUID();
    const tokenPayload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
    const refreshTokenPayload: RefreshTokenPayload = { userId: user.id, tokenId: newTokenId };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(refreshTokenPayload);

    // Save new token in Redis (7 days expiration)
    await redisConnection.setex(`refresh_token:${user.id}:${newTokenId}`, 7 * 24 * 60 * 60, 'active');

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
      const redisKey = `refresh_token:${decoded.userId}:${decoded.tokenId}`;
      await redisConnection.del(redisKey);
      logger.info(`🚪 Revoked refresh token session: ${decoded.tokenId} for user: ${decoded.userId}`);
    } catch (error) {
      // Fail gracefully on logout
      logger.warn('Failed to parse refresh token during logout.');
    }
  }

  /**
   * Helper: Generate access and refresh tokens and save refresh token in Redis
   */
  private async generateAuthSession(user: any): Promise<AuthResponse> {
    const tokenId = crypto.randomUUID();
    const tokenPayload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
    const refreshTokenPayload: RefreshTokenPayload = { userId: user.id, tokenId };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(refreshTokenPayload);

    // Store in Redis (7 days limit)
    await redisConnection.setex(`refresh_token:${user.id}:${tokenId}`, 7 * 24 * 60 * 60, 'active');

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Helper: Revoke all active refresh tokens for a user
   */
  private async revokeAllSessions(userId: string): Promise<void> {
    const stream = redisConnection.scanStream({
      match: `refresh_token:${userId}:*`,
    });

    stream.on('data', async (keys: string[]) => {
      if (keys.length > 0) {
        await redisConnection.del(...keys);
      }
    });

    return new Promise((resolve, reject) => {
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
    });
  }
}

export default AuthService;
