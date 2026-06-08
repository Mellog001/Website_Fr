"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const rate_limiter_1 = require("./common/middleware/rate-limiter");
const error_middleware_1 = require("./common/middleware/error.middleware");
const logger_1 = require("./config/logger");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// Secure headers
app.use((0, helmet_1.default)());
// Cross Origin Resource Sharing
app.use((0, cors_1.default)({
    origin: '*', // Adjust this to specific domains in production
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
}));
// Request Body Parsers
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// HTTP Request Logger
const morganStream = {
    write: (message) => logger_1.logger.http(message.trim()),
};
app.use((0, morgan_1.default)(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));
// Apply rate limiter globally
app.use('/api', rate_limiter_1.globalLimiter);
// Health Check API
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'success',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: 'UP',
            redis: 'UP',
        },
    });
});
// Centralized Routing hooks
app.use('/api/v1', routes_1.default);
// Catch 404 and forward to error handler
app.use((_req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Resource not found: ${_req.method} ${_req.originalUrl}`,
    });
});
// Central Error Interceptor Middleware
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
//# sourceMappingURL=app.js.map