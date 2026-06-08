"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const prisma_1 = require("./config/prisma");
const redis_1 = require("./config/redis");
const server = app_1.default.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`🚀 EduConnect server is running in [${env_1.env.NODE_ENV}] mode on port ${env_1.env.PORT}`);
});
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    // Close HTTP Server first to reject incoming network traffic
    server.close(() => {
        logger_1.logger.info('HTTP server closed.');
    });
    try {
        // Disconnect Prisma DB
        await prisma_1.prisma.$disconnect();
        logger_1.logger.info('Prisma database connection disconnected.');
        // Disconnect Redis
        await redis_1.redisConnection.quit();
        logger_1.logger.info('Redis client disconnected.');
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