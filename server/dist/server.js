"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const database_1 = __importDefault(require("./config/database"));
const job_processor_1 = require("./jobs/job-processor");
const server = app_1.default.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`🚀 EduConnect server is running in [${env_1.env.NODE_ENV}] mode on port ${env_1.env.PORT}`);
    // Start the MySQL-backed background job processor
    (0, job_processor_1.startJobProcessor)();
});
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    // Close HTTP Server first to reject incoming network traffic
    server.close(() => {
        logger_1.logger.info('HTTP server closed.');
    });
    try {
        // Stop the background job processor
        (0, job_processor_1.stopJobProcessor)();
        // Disconnect MySQL pool
        await database_1.default.end();
        logger_1.logger.info('MySQL database connection pool closed.');
        logger_1.logger.info('Graceful shutdown completed successfully. Exiting.');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Error occurred during server shutdown:', error);
        process.exit(1);
    }
};
// Handle process runtime signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Capture uncaught exception bounds
process.on('uncaughtException', (error) => {
    logger_1.logger.error('CRITICAL: Uncaught Exception thrown:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('CRITICAL: Unhandled Promise Rejection:', reason);
    process.exit(1);
});
//# sourceMappingURL=server.js.map