"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupQueue = exports.notificationQueue = exports.paymentQueue = void 0;
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
/**
 * Factory: create a named, MySQL-backed job queue.
 * The `add` method inserts a row into `scheduled_jobs`.
 * The background job-processor polls that table every 30 s.
 */
const createQueue = (name) => ({
    add: async (jobName, data, opts = {}) => {
        const runAt = new Date(Date.now() + (opts.delay || 0));
        const jobId = (0, uuid_1.v4)();
        await database_1.default.execute('INSERT INTO scheduled_jobs (id, queue_name, job_name, payload, run_at) VALUES (?, ?, ?, ?, ?)', [jobId, name, jobName, JSON.stringify(data), runAt]);
        logger_1.logger.info(`📋 Job [${jobName}] queued in [${name}] | ID: ${jobId} | Run at: ${runAt.toISOString()}`);
        return { id: jobId };
    },
});
exports.paymentQueue = createQueue('payments');
exports.notificationQueue = createQueue('notifications');
exports.cleanupQueue = createQueue('cleanup');
exports.default = { paymentQueue: exports.paymentQueue, notificationQueue: exports.notificationQueue, cleanupQueue: exports.cleanupQueue };
//# sourceMappingURL=queues.js.map