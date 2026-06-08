"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const app_error_1 = require("../errors/app-error");
const logger_1 = require("../../config/logger");
const env_1 = require("../../config/env");
const errorMiddleware = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details = [];
    // Handle known operational exceptions
    if (err instanceof app_error_1.AppError) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details;
    }
    // Handle Prisma Database constraint exceptions
    else if (err.constructor && err.constructor.name.startsWith('PrismaClient')) {
        const prismaErr = err;
        logger_1.logger.error('Prisma DB error captured:', prismaErr);
        if (prismaErr.code === 'P2002') {
            statusCode = 409;
            message = `Conflict: A record with that ${prismaErr.meta?.target?.join(', ') || 'key'} already exists.`;
        }
        else if (prismaErr.code === 'P2025') {
            statusCode = 404;
            message = 'Not Found: The requested database entity does not exist.';
        }
        else if (prismaErr.code === 'P2003') {
            statusCode = 400;
            message = 'Bad Request: Relational foreign key constraint failed.';
        }
        else {
            statusCode = 400;
            message = 'Database operation failed.';
        }
    }
    // Handle JWT parsing exceptions
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication Error: Access token has expired.';
    }
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Authentication Error: Invalid access token signature.';
    }
    // Log server/internal issues with stack trace
    if (statusCode === 500) {
        logger_1.logger.error(`[CRITICAL] Server Error: ${err.message}`, {
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
        });
    }
    else {
        logger_1.logger.warn(`Operational Warning [${statusCode}] ${req.method} ${req.originalUrl}: ${err.message}`);
    }
    res.status(statusCode).json({
        status: 'error',
        message,
        ...(details.length > 0 ? { details } : {}),
        ...(env_1.env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
    });
};
exports.errorMiddleware = errorMiddleware;
exports.default = exports.errorMiddleware;
//# sourceMappingURL=error.middleware.js.map