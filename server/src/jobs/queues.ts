import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { logger } from '../config/logger';

interface AddJobOptions {
  delay?: number; // milliseconds to wait before the job should run
}

/**
 * Factory: create a named, MySQL-backed job queue.
 * The `add` method inserts a row into `scheduled_jobs`.
 * The background job-processor polls that table every 30 s.
 */
const createQueue = (name: string) => ({
  add: async (
    jobName: string,
    data: any,
    opts: AddJobOptions = {}
  ): Promise<{ id: string }> => {
    const runAt = new Date(Date.now() + (opts.delay || 0));
    const jobId = uuidv4();

    await pool.execute(
      'INSERT INTO scheduled_jobs (id, queue_name, job_name, payload, run_at) VALUES (?, ?, ?, ?, ?)',
      [jobId, name, jobName, JSON.stringify(data), runAt]
    );

    logger.info(
      `📋 Job [${jobName}] queued in [${name}] | ID: ${jobId} | Run at: ${runAt.toISOString()}`
    );
    return { id: jobId };
  },
});

export const paymentQueue      = createQueue('payments');
export const notificationQueue = createQueue('notifications');
export const cleanupQueue      = createQueue('cleanup');

export default { paymentQueue, notificationQueue, cleanupQueue };
