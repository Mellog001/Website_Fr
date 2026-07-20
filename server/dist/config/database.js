"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = require("./env");
const logger_1 = require("./logger");
exports.pool = promise_1.default.createPool({
    uri: env_1.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
});
// Verify connection on startup
exports.pool.getConnection()
    .then((conn) => {
    logger_1.logger.info('🗄️  MySQL database connection pool established successfully');
    conn.release();
})
    .catch((err) => {
    logger_1.logger.error('❌ MySQL database connection failed:', err.message);
});
exports.default = exports.pool;
//# sourceMappingURL=database.js.map