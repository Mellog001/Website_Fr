"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupQueue = exports.notificationQueue = exports.paymentQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const defaultQueueOptions = {
    connection: redis_1.redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 10s, 20s...
        },
        removeOnComplete: { age: 24 * 3600 }, // Clean up completed jobs after 1 day
        removeOnFail: { age: 7 * 24 * 3600 }, // Keep failures for 7 days for audits
    },
};
exports.paymentQueue = new bullmq_1.Queue('payments', defaultQueueOptions);
exports.notificationQueue = new bullmq_1.Queue('notifications', defaultQueueOptions);
exports.cleanupQueue = new bullmq_1.Queue('cleanup', defaultQueueOptions);
exports.default = { paymentQueue: exports.paymentQueue, notificationQueue: exports.notificationQueue, cleanupQueue: exports.cleanupQueue };
//# sourceMappingURL=queues.js.map