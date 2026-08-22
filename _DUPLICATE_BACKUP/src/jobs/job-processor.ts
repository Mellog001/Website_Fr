/**
 * Background Job Processor
 * -------------------------
 * Polls `scheduled_jobs` every 30 s using a single setInterval loop.
 * Replaces the BullMQ / Redis worker that was previously used.
 *
 * Job claiming is done atomically with MySQL's `FOR UPDATE SKIP LOCKED`
 * (available on MySQL 8.0+, which this project requires).
 *
 * Retry behaviour:
 *   - Up to `max_attempts` retries (default 3)
 *   - Exponential back-off:  5 s → 10 s → 20 s → FAILED
 */
import pool from '../config/database';
import { MpesaService } from '../features/payments/mpesa.service';
import { logger } from '../config/logger';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const mpesaService = new MpesaService();

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const BATCH_SIZE = 5;

// ─── Job handlers ────────────────────────────────────────────────────────────

async function processPaymentJob(jobName: string, payload: any): Promise<void> {
  if (jobName === 'reconcile-payment') {
    const { paymentId } = payload;
    if (!paymentId) throw new Error('Missing paymentId in job payload.');
    await mpesaService.reconcilePayment(paymentId);
  } else {
    logger.warn(`⚠️ Unknown payment job type: [${jobName}]`);
  }
}

// ─── Expired token cleanup ───────────────────────────────────────────────────

async function cleanExpiredTokens(): Promise<void> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
  );
  if (result.affectedRows > 0) {
    logger.info(`🧹 Cleaned ${result.affectedRows} expired refresh token(s).`);
  }
}

// ─── Core poll cycle ─────────────────────────────────────────────────────────

async function processDueJobs(): Promise<void> {
  const connection = await pool.getConnection();
  let jobs: RowDataPacket[] = [];

  // ── 1. Claim a batch of PENDING jobs atomically ──
  try {
    await connection.beginTransaction();

    [jobs] = await connection.execute<RowDataPacket[]>(
      `SELECT id, queue_name, job_name, payload, attempts, max_attempts
       FROM scheduled_jobs
       WHERE status = 'PENDING' AND run_at <= NOW()
       ORDER BY run_at ASC
       LIMIT ?
       FOR UPDATE`,
      [BATCH_SIZE]
    );

    if (jobs.length === 0) {
      await connection.rollback();
      connection.release();
      return;
    }

    const jobIds = jobs.map((j: any) => j.id);
    const placeholders = jobIds.map(() => '?').join(',');

    await connection.execute(
      `UPDATE scheduled_jobs
       SET status = 'PROCESSING', attempts = attempts + 1
       WHERE id IN (${placeholders})`,
      jobIds
    );

    await connection.commit();
  } catch (err: any) {
    logger.error('Job processor transaction error:', err.message);
    try { await connection.rollback(); } catch {}
    connection.release();
    return;
  }

  connection.release(); // release back to pool before doing the actual work

  // ── 2. Process each claimed job ──
  for (const job of jobs as any[]) {
    const payload =
      typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

    try {
      logger.info(
        `👷 Processing job [${job.job_name}] ID: ${job.id} | Queue: [${job.queue_name}]`
      );

      if (job.queue_name === 'payments') {
        await processPaymentJob(job.job_name, payload);
      } else {
        logger.warn(`No handler registered for queue [${job.queue_name}]. Marking completed.`);
      }

      await pool.execute(
        `UPDATE scheduled_jobs SET status = 'COMPLETED' WHERE id = ?`,
        [job.id]
      );
      logger.info(`✅ Job ${job.id} [${job.job_name}] completed.`);

    } catch (err: any) {
      logger.error(`❌ Job ${job.id} [${job.job_name}] failed: ${err.message}`);

      // job.attempts was already incremented to currentAttempts in the DB
      const currentAttempts: number = job.attempts + 1;
      const exhausted = currentAttempts >= job.max_attempts;
      const newStatus = exhausted ? 'FAILED' : 'PENDING';

      // Exponential back-off: 5 s → 10 s → 20 s (capped at 60 s)
      const backoffMs = exhausted
        ? 0
        : Math.min(5_000 * Math.pow(2, currentAttempts - 1), 60_000);
      const runAt = new Date(Date.now() + backoffMs);

      await pool.execute(
        `UPDATE scheduled_jobs
         SET status = ?, run_at = ?, error_message = ?
         WHERE id = ?`,
        [newStatus, runAt, (err.message || 'Unknown error').slice(0, 500), job.id]
      );
    }
  }
}

// ─── Public lifecycle API ─────────────────────────────────────────────────────

let processorInterval: ReturnType<typeof setInterval> | null = null;

export function startJobProcessor(): void {
  logger.info('🔄 Background job processor started. Polling every 30 seconds.');

  // Run immediately on startup to catch any jobs left over from a previous run
  processDueJobs().catch((err) =>
    logger.error('Initial job poll error:', err.message)
  );
  cleanExpiredTokens().catch((err) =>
    logger.error('Initial token cleanup error:', err.message)
  );

  processorInterval = setInterval(async () => {
    await processDueJobs().catch((err) =>
      logger.error('Job poll error:', err.message)
    );
    await cleanExpiredTokens().catch((err) =>
      logger.error('Token cleanup error:', err.message)
    );
  }, POLL_INTERVAL_MS);
}

export function stopJobProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    logger.info('🛑 Background job processor stopped.');
  }
}
