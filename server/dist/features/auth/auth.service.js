"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
const redis_1 = require("../../config/redis");
const hash_1 = require("../../common/utils/hash");
const jwt_1 = require("../../common/utils/jwt");
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
class AuthService {
    /**
     * Register a new Student or Tutor user
     */
    async register(payload) {
        const { email, password, role } = payload;
        // Check if email already registered
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw app_error_1.AppError.conflict('An account with this email address already exists.');
        }
        const hashedPassword = await (0, hash_1.hashPassword)(password);
        // Create user and profile in a single atomic transaction
        const user = await prisma_1.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                    role,
                },
            });
            // If user is a TUTOR, initialize their empty profile
            if (role === client_1.UserRole.TUTOR) {
                await tx.tutorProfile.create({
                    data: {
                        userId: newUser.id,
                        competencyStatus: 'PENDING',
                    },
                });
            }
            return newUser;
        });
        logger_1.logger.info(`👤 New user registered: ${user.email} (${user.role})`);
        return this.generateAuthSession(user);
    }
    /**
     * Log in user using email and password
     */
    async login(payload) {
        const { email, password } = payload;
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                email,
                deletedAt: null, // Don't let soft-deleted users login
            },
        });
        if (!user || !(await (0, hash_1.comparePassword)(password, user.passwordHash))) {
            throw app_error_1.AppError.unauthorized('Invalid email or password credentials.');
        }
        logger_1.logger.info(`🔑 User logged in: ${user.email}`);
        return this.generateAuthSession(user);
    }
    /**
     * Rotate access and refresh tokens securely
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
        const redisKey = `refresh_token:${userId}:${tokenId}`;
        const tokenExists = await redis_1.redisConnection.get(redisKey);
        if (!tokenExists) {
            // ⚠️ REUSE ATTACK DETECTED!
            // Revoke all refresh tokens for this user immediately for extreme safety
            logger_1.logger.warn(`⚠️ Potential JWT refresh token reuse attack detected for user ${userId}. Revoking token family.`);
            await this.revokeAllSessions(userId);
            throw app_error_1.AppError.unauthorized('Potential session theft detected. All sessions revoked. Please log in again.');
        }
        // Single use token: delete old token from Redis
        await redis_1.redisConnection.del(redisKey);
        // Fetch user
        const user = await prisma_1.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
        });
        if (!user) {
            throw app_error_1.AppError.unauthorized('User session invalid or deleted.');
        }
        // Generate new family
        const newTokenId = crypto_1.default.randomUUID();
        const tokenPayload = { userId: user.id, email: user.email, role: user.role };
        const refreshTokenPayload = { userId: user.id, tokenId: newTokenId };
        const newAccessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        const newRefreshToken = (0, jwt_1.signRefreshToken)(refreshTokenPayload);
        // Save new token in Redis (7 days expiration)
        await redis_1.redisConnection.setex(`refresh_token:${user.id}:${newTokenId}`, 7 * 24 * 60 * 60, 'active');
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
            const redisKey = `refresh_token:${decoded.userId}:${decoded.tokenId}`;
            await redis_1.redisConnection.del(redisKey);
            logger_1.logger.info(`🚪 Revoked refresh token session: ${decoded.tokenId} for user: ${decoded.userId}`);
        }
        catch (error) {
            // Fail gracefully on logout
            logger_1.logger.warn('Failed to parse refresh token during logout.');
        }
    }
    /**
     * Helper: Generate access and refresh tokens and save refresh token in Redis
     */
    async generateAuthSession(user) {
        const tokenId = crypto_1.default.randomUUID();
        const tokenPayload = { userId: user.id, email: user.email, role: user.role };
        const refreshTokenPayload = { userId: user.id, tokenId };
        const accessToken = (0, jwt_1.signAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.signRefreshToken)(refreshTokenPayload);
        // Store in Redis (7 days limit)
        await redis_1.redisConnection.setex(`refresh_token:${user.id}:${tokenId}`, 7 * 24 * 60 * 60, 'active');
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
    async revokeAllSessions(userId) {
        const stream = redis_1.redisConnection.scanStream({
            match: `refresh_token:${userId}:*`,
        });
        stream.on('data', async (keys) => {
            if (keys.length > 0) {
                await redis_1.redisConnection.del(...keys);
            }
        });
        return new Promise((resolve, reject) => {
            stream.on('end', () => resolve());
            stream.on('error', (err) => reject(err));
        });
    }
}
exports.AuthService = AuthService;
exports.default = AuthService;
//# sourceMappingURL=auth.service.js.map