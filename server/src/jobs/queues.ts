import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

const defaultQueueOptions = {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s...
    },
    removeOnComplete: { age: 24 * 3600 }, // Clean up completed jobs after 1 day
    removeOnFail: { age: 7 * 24 * 3600 },  // Keep failures for 7 days for audits
  },
};

export const paymentQueue = new Queue('payments', defaultQueueOptions);
export const notificationQueue = new Queue('notifications', defaultQueueOptions);
export const cleanupQueue = new Queue('cleanup', defaultQueueOptions);
export default { paymentQueue, notificationQueue, cleanupQueue };
