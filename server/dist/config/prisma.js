"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
const env_1 = require("./env");
exports.prisma = new client_1.PrismaClient({
    log: env_1.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});
// Setup hook to log queries in development
if (env_1.env.NODE_ENV === 'development') {
    exports.prisma.$on('query', (e) => {
        logger_1.logger.debug(`Prisma Query: ${e.query} -- Params: ${e.params}`);
    });
}
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map