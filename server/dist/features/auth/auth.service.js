"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const enums_1 = require("../../types/enums");
const database_1 = __importDefault(require("../../config/database"));
const hash_1 = require("../../common/utils/hash");
const jwt_1 = require("../../common/utils/jwt");
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
const email_service_1 = require("../../common/services/email.service");
const REFRESH_TOKEN_TTL_DAYS = 7;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;
class AuthService {
    /**
     * Register a new Student or Tutor user
     */
    async register(payload) {
        const { email, password, role } = payload;
        // Check if email already registered
        const [existingRows] = await database_1.default.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existingRows.length > 0) {
            throw app_error_1.AppError.conflict('An account with this email address already exists.');
        }
        const hashedPassword = await (0, hash_1.hashPassword)(password);
        const userId = (0, uuid_1.v4)();
        // Create user and profile in a single atomic transaction
        const connection = await database_1.default.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('INSERT INTO users (id, email, password_hash, role, is_email_verified) VALUES (?, ?, ?, ?, ?)', [userId, email, hashedPassword, role, false]);
            // If user is a TUTOR, initialize their empty profile
            if (role === enums_1.UserRole.TUTOR) {
                const profileId = (0, uuid_1.v4)();
                await connection.execute('INSERT INTO tutor_profiles (id, user_id, competency_status) VALUES (?, ?, ?)', [profileId, userId, 'PENDING']);
            }
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
        logger_1.logger.info(`👤 New user registered: ${email} (${role})`);
        // Generate Verification Token and Send Email
        const token = await this.generateVerificationToken(userId, 'EMAIL_VERIFICATION', EMAIL_VERIFICATION_TTL_HOURS);
        await email_service_1.emailService.sendVerificationEmail(email, token);
        // Return user without auth tokens because email is not verified yet
        return {
            user: { id: userId, email, role, isEmailVerified: false }
        };
    }
    /**
     * Log in user using email and password
     */
    async login(payload) {
        const { email, password } = payload;
        const [rows] = await database_1.default.execute('SELECT id, email, password_hash, role, is_email_verified FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
        const user = rows[0];
        if (!user || !(await (0, hash_1.comparePassword)(password, user.password_hash))) {
            throw app_error_1.AppError.unauthorized('Invalid email or password credentials.');
        }
        if (!user.is_email_verified) {
            throw app_error_1.AppError.unauthorized('Please verify your email before logging in.');
        }
        logger_1.logger.info(`🔑 User logged in: ${user.email}`);
        return this.generateAuthSession({ id: user.id, email: user.email, role: user.role, isEmailVerified: user.is_email_verified });
    }
    /**
     * Get Current User Profile
     */
    async getMe(userId) {
        const [rows] = await database_1.default.execute('SELECT id, email, role, is_email_verified, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
        const user = rows[0];
        if (!user) {
            throw app_error_1.AppError.notFound('User not found.');
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
    async forgotPassword(email) {
        const [rows] = await database_1.default.execute('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
        const user = rows[0];
        if (!user) {
            // Do not reveal if the user exists or not
            return;
        }
        const token = await this.generateVerificationToken(user.id, 'PASSWORD_RESET', PASSWORD_RESET_TTL_HOURS);
        await email_service_1.emailService.sendPasswordResetEmail(email, token);
    }
    /**
     * Reset Password Using Token
     */
    async resetPassword(token, newPassword) {
        const userId = await this.validateAndConsumeToken(token, 'PASSWORD_RESET');
        if (!userId) {
            throw app_error_1.AppError.badRequest('Invalid or expired password reset token.');
        }
        const hashedPassword = await (0, hash_1.hashPassword)(newPassword);
        await database_1.default.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
        // Revoke all existing sessions to force re-login on all devices
        await this.revokeAllSessions(userId);
        logger_1.logger.info(`🔐 Password reset successfully for user: ${userId}`);
    }
    /**
     * Change Password (Authenticated User)
     */
    async changePassword(userId, oldPassword, newPassword) {
        const [rows] = await database_1.default.execute('SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
        const user = rows[0];
        if (!user || !(await (0, hash_1.comparePassword)(oldPassword, user.password_hash))) {
            throw app_error_1.AppError.unauthorized('Incorrect old password.');
        }
        const hashedPassword = await (0, hash_1.hashPassword)(newPassword);
        await database_1.default.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
        // Revoke all existing sessions to force re-login on all devices
        await this.revokeAllSessions(userId);
        logger_1.logger.info(`🔐 Password changed successfully for user: ${userId}`);
    }
    /**
     * Verify Email
     */
    async verifyEmail(token) {
        const userId = await this.validateAndConsumeToken(token, 'EMAIL_VERIFICATION');
        if (!userId) {
            throw app_error_1.AppError.badRequest('Invalid or expired email verification token.');
        }
        await database_1.default.execute('UPDATE users SET is_email_verified = TRUE WHERE id = ?', [userId]);
        logger_1.logger.info(`📧 Email verified successfully for user: ${userId}`);
    }
    /**
     * Resend Verification Email
     */
    async resendVerificationEmail(email) {
        const [rows] = await database_1.default.execute('SELECT id, is_email_verified FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
        const user = rows[0];
        if (!user) {
            return; // Do not reveal if the user exists
        }
        if (user.is_email_verified) {
            throw app_error_1.AppError.badRequest('Email is already verified.');
        }
        const token = await this.generateVerificationToken(user.id, 'EMAIL_VERIFICATION', EMAIL_VERIFICATION_TTL_HOURS);
        await email_service_1.emailService.sendVerificationEmail(email, token);
    }
    /**
     * Rotate access and refresh tokens securely using MySQL token store
     */
    async refresh(token) {
        let decoded;
        try {
            decoded = (0, jwt_1.verifyRefreshToken)(token);
        }
        catch (err) {
            throw app_error_1.AppError.unauthorized('Invalid or expired refresh token signature.');
        }
        const { userId, tokenId } = decoded;
        // Check if refresh token exists and is not expired in MySQL
        const [tokenRows] = await database_1.default.execute('SELECT id FROM refresh_tokens WHERE user_id = ? AND token_id = ? AND expires_at > NOW()', [userId, tokenId]);
        if (tokenRows.length === 0) {
            // ⚠️ REUSE ATTACK DETECTED!
            // Revoke all refresh tokens for this user immediately for extreme safety
            logger_1.logger.warn(`⚠️ Potential JWT refresh token reuse attack detected for user ${userId}. Revoking token family.`);
            await this.revokeAllSessions(userId);
            throw app_error_1.AppError.unauthorized('Potential session theft detected. All sessions revoked. Please log in again.');
        }
        // Single use token: delete old token from database
        await database_1.default.execute('DELETE FROM refresh_tokens WHERE user_id = ? AND token_id = ?', [userId, tokenId]);
        // Fetch user
        const [rows] = await database_1.default.execute('SELECT id, email, role, is_email_verified FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
        const user = rows[0];
        if (!user) {
            throw app_error_1.AppError.unauthorized('User session invalid or deleted.');
        }
        if (!user.is_email_verified) {
            throw app_error_1.AppError.unauthorized('Please verify your email to continue.');
        }
        // Generate new token family
        const newTokenId = crypto_1.default.randomUUID();
        const tokenPayload = { userId: user.id, email: user.email, role: user.role };
        const refreshTokenPayload = { userId: user.id, tokenId: newTokenId };
        const newAccessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        const newRefreshToken = (0, jwt_1.signRefreshToken)(refreshTokenPayload);
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
    async logout(token) {
        try {
            const decoded = (0, jwt_1.verifyRefreshToken)(token);
            await database_1.default.execute('DELETE FROM refresh_tokens WHERE user_id = ? AND token_id = ?', [decoded.userId, decoded.tokenId]);
            logger_1.logger.info(`🚪 Revoked refresh token session: ${decoded.tokenId} for user: ${decoded.userId}`);
        }
        catch (error) {
            // Fail gracefully on logout
            logger_1.logger.warn('Failed to parse refresh token during logout.');
        }
    }
    /**
     * Helper: Generate access and refresh tokens and persist refresh token in MySQL
     */
    async generateAuthSession(user) {
        const tokenId = crypto_1.default.randomUUID();
        const tokenPayload = { userId: user.id, email: user.email, role: user.role };
        const refreshTokenPayload = { userId: user.id, tokenId };
        const accessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.signRefreshToken)(refreshTokenPayload);
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
    async storeRefreshToken(userId, tokenId) {
        const id = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
        await database_1.default.execute('INSERT INTO refresh_tokens (id, user_id, token_id, expires_at) VALUES (?, ?, ?, ?)', [id, userId, tokenId, expiresAt]);
    }
    /**
     * Helper: Generate a verification token for email verification or password reset
     */
    async generateVerificationToken(userId, type, ttlHours) {
        // Revoke previous tokens of the same type for this user
        await database_1.default.execute('DELETE FROM verification_tokens WHERE user_id = ? AND type = ?', [userId, type]);
        const id = (0, uuid_1.v4)();
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const hashedToken = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
        await database_1.default.execute('INSERT INTO verification_tokens (id, user_id, token, type, expires_at) VALUES (?, ?, ?, ?, ?)', [id, userId, hashedToken, type, expiresAt]);
        // Return the raw token to be sent to the user
        return rawToken;
    }
    /**
     * Helper: Validate a verification token and return the associated user ID.
     * Consumes (deletes) the token if valid.
     */
    async validateAndConsumeToken(rawToken, type) {
        const hashedToken = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        const [rows] = await database_1.default.execute('SELECT id, user_id FROM verification_tokens WHERE token = ? AND type = ? AND expires_at > NOW()', [hashedToken, type]);
        if (rows.length === 0) {
            return null;
        }
        const { id, user_id } = rows[0];
        // Consume the token
        await database_1.default.execute('DELETE FROM verification_tokens WHERE id = ?', [id]);
        return user_id;
    }
    /**
     * Helper: Revoke all active refresh tokens for a user (instant full session invalidation)
     */
    async revokeAllSessions(userId) {
        await database_1.default.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
        logger_1.logger.info(`🔐 All active sessions revoked for user: ${userId}`);
    }
}
exports.AuthService = AuthService;
exports.default = AuthService;
//# sourceMappingURL=auth.service.js.map