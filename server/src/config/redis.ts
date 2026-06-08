import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry: attempt ${times}. Reconnecting in ${delay}ms`);
    return delay;
  },
});

redisConnection.on('connect', () => {
  logger.info('📡 Redis connection established successfully');
});

redisConnection.on('error', (err) => {
  logger.error('❌ Redis Connection Error:', err);
});
