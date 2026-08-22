"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.optionalAuthenticate = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const app_error_1 = require("../errors/app-error");
const database_1 = __importDefault(require("../../config/database"));
const authenticate = async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(app_error_1.AppError.unauthorized('Authentication failed: Missing or invalid token format.'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        const [rows] = await database_1.default.execute('SELECT id, email, role FROM users WHERE id = ? AND deleted_at IS NULL', [decoded.userId]);
        const user = rows[0];
        if (!user) {
            return next(app_error_1.AppError.unauthorized('Authentication failed: User account not found or deactivated.'));
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const optionalAuthenticate = async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // Let guests pass
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        const [rows] = await database_1.default.execute('SELECT id, email, role FROM users WHERE id = ? AND deleted_at IS NULL', [decoded.userId]);
        const user = rows[0];
        if (user) {
            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
            };
        }
        next();
    }
    catch (error) {
        // If token is invalid/expired, fail-fast rather than letting them browse under bad signature
        next(error);
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
const authorize = (...allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(app_error_1.AppError.unauthorized('Authentication required to perform this action.'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(app_error_1.AppError.forbidden(`Access Denied: Required roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`));
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.middleware.js.map