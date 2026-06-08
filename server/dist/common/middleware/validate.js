"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const app_error_1 = require("../errors/app-error");
const validate = (schema) => {
    return async (req, _res, next) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Assign parsed values back to requests to maintain clean type casting
            req.body = parsed.body;
            req.query = parsed.query;
            req.params = parsed.params;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.errors.map((err) => ({
                    field: err.path.slice(1).join('.'), // Remove top-level 'body'/'query'/'params'
                    message: err.message,
                }));
                next(new app_error_1.AppError('Request validation failed', 400, issues));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validate = validate;
exports.default = exports.validate;
//# sourceMappingURL=validate.js.map