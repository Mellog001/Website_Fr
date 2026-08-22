import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import pool from './config/database';
import { startJobProcessor, stopJobProcessor } from './jobs/job-processor';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 EduConnect server is running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
  // Start the MySQL-backed background job processor
  startJobProcessor();
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close HTTP Server first to reject incoming network traffic
  server.close(() => {
    logger.info('HTTP server closed.');
  });

  try {
    // Stop the background job processor
    stopJobProcessor();

    // Disconnect MySQL pool
    await pool.end();
    logger.info('MySQL database connection pool closed.');

    logger.info('Graceful shutdown completed successfully. Exiting.');
    process.exit(0);
  } catch (error) {
    logger.error('Error occurred during server shutdown:', error);
    process.exit(1);
  }
};

// Handle process runtime signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Capture uncaught exception bounds
process.on('uncaughtException', (error) => {
  logger.error('CRITICAL: Uncaught Exception thrown:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('CRITICAL: Unhandled Promise Rejection:', reason);
  process.exit(1);
});
