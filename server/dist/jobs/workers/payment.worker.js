"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const redis_1 = require("../../config/redis");
const mpesa_service_1 = require("../../features/payments/mpesa.service");
const logger_1 = require("../../config/logger");
const mpesaService = new mpesa_service_1.MpesaService();
const worker = new bullmq_1.Worker('payments', async (job) => {
    logger_1.logger.info(`👷 Payment Worker processing Job ${job.id} [${job.name}]`);
    if (job.name === 'reconcile-payment') {
        const { paymentId } = job.data;
        if (!paymentId) {
            throw new Error('Reconciliation failed: Missing paymentId in job data.');
        }
        await mpesaService.reconcilePayment(paymentId);
    }
}, {
    connection: redis_1.redisConnection,
    concurrency: 5, // Process up to 5 reconciliations in parallel
});
worker.on('completed', (job) => {
    logger_1.logger.info(`✅ Payment Job ${job.id} has completed successfully.`);
});
worker.on('failed', (job, err) => {
    logger_1.logger.error(`❌ Payment Job ${job?.id} failed with error: ${err.message}`);
});
exports.default = worker;
//# sourceMappingURL=payment.worker.js.map