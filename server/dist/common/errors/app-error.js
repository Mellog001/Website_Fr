"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    isOperational;
    details;
    constructor(message, statusCode = 500, details = [], isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message, details = []) {
        return new AppError(message, 400, details);
    }
    static unauthorized(message) {
        return new AppError(message, 401);
    }
    static forbidden(message) {
        return new AppError(message, 403);
    }
    static notFound(message) {
        return new AppError(message, 404);
    }
    static conflict(message) {
        return new AppError(message, 409);
    }
    static internal(message) {
        return new AppError(message, 500, [], false);
    }
}
exports.AppError = AppError;
exports.default = AppError;
//# sourceMappingURL=app-error.js.map