"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.globalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../../config/env");
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: env_1.env.NODE_ENV === 'test' ? 10000 : 100, // higher limit during test
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
});
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: env_1.env.NODE_ENV === 'test' ? 10000 : 10, // strict 10 attempts for signup/login
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many login attempts from this IP. Account auth rate limited for security.',
    },
});
//# sourceMappingURL=rate-limiter.js.map