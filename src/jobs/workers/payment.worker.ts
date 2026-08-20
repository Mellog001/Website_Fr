/**
 * This file previously contained a BullMQ Worker.
 * The BullMQ / Redis stack has been removed.
 *
 * Job processing is now handled by the MySQL-backed job processor.
 * See: src/jobs/job-processor.ts
 */
export { startJobProcessor, stopJobProcessor } from '../job-processor';
