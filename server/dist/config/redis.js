"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
exports.redisConnection = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Critical requirement for BullMQ
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        logger_1.logger.warn(`Redis connection retry: attempt ${times}. Reconnecting in ${delay}ms`);
        return delay;
    },
});
exports.redisConnection.on('connect', () => {
    logger_1.logger.info('📡 Redis connection established successfully');
});
exports.redisConnection.on('error', (err) => {
    logger_1.logger.error('❌ Redis Connection Error:', err);
});
//# sourceMappingURL=redis.js.map