"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suspendUserSchema = void 0;
const zod_1 = require("zod");
exports.suspendUserSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().uuid('Invalid user ID format'),
    }),
    body: zod_1.z.object({
        isSuspended: zod_1.z.boolean({
            required_error: 'Suspension flag (isSuspended) is required',
        }),
    }),
});
//# sourceMappingURL=admin.validation.js.map