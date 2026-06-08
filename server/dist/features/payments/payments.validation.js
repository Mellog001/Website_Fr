"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateStkPushSchema = void 0;
const zod_1 = require("zod");
exports.initiateStkPushSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: zod_1.z.string().uuid('Invalid course ID format'),
        phoneNumber: zod_1.z.string()
            .min(10, 'Phone number must be at least 10 digits')
            .max(12, 'Phone number must not exceed 12 digits')
            .regex(/^(?:254|\+254|0)?(7|1)([0-9]{8})$/, 'Invalid Kenyan phone number format. Must be like 07XXXXXXXX or 2547XXXXXXXX.'),
    }),
});
//# sourceMappingURL=payments.validation.js.map