import { Worker, Job } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { MpesaService } from '../../features/payments/mpesa.service';
import { logger } from '../../config/logger';

const mpesaService = new MpesaService();

const worker = new Worker(
  'payments',
  async (job: Job) => {
    logger.info(`👷 Payment Worker processing Job ${job.id} [${job.name}]`);

    if (job.name === 'reconcile-payment') {
      const { paymentId } = job.data;
      if (!paymentId) {
        throw new Error('Reconciliation failed: Missing paymentId in job data.');
      }
      await mpesaService.reconcilePayment(paymentId);
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // Process up to 5 reconciliations in parallel
  }
);

worker.on('completed', (job) => {
  logger.info(`✅ Payment Job ${job.id} has completed successfully.`);
});

worker.on('failed', (job, err) => {
  logger.error(`❌ Payment Job ${job?.id} failed with error: ${err.message}`);
});

export default worker;
