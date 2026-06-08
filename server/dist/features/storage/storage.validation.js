"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadUrlSchema = void 0;
const zod_1 = require("zod");
exports.getUploadUrlSchema = zod_1.z.object({
    body: zod_1.z.object({
        filename: zod_1.z.string().min(1, 'Filename is required'),
        contentType: zod_1.z.string().min(1, 'Content-Type is required'),
        folder: zod_1.z.enum(['qualifications', 'materials', 'assessments', 'submissions', 'avatars'], {
            errorMap: () => ({ message: 'Invalid target folder directory structure.' }),
        }),
    }),
});
//# sourceMappingURL=storage.validation.js.map