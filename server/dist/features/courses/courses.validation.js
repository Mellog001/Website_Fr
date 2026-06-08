"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryCourseCatalogSchema = exports.createMaterialSchema = exports.createModuleSchema = exports.updateCourseSchema = exports.createCourseSchema = exports.createSubjectSchema = void 0;
const zod_1 = require("zod");
exports.createSubjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Subject name must be at least 2 characters'),
        code: zod_1.z.string().min(2, 'Code must be at least 2 characters').toUpperCase(),
        description: zod_1.z.string().max(500).optional(),
    }),
});
exports.createCourseSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(5, 'Title must be at least 5 characters long').max(100),
        description: zod_1.z.string().min(10, 'Description must be at least 10 characters long'),
        price: zod_1.z.number().min(0, 'Price cannot be negative'),
        subjectId: zod_1.z.string().uuid('Invalid subject ID format'),
    }),
});
exports.updateCourseSchema = zod_1.z.object({
    params: zod_1.z.object({
        courseId: zod_1.z.string().uuid('Invalid course ID format'),
    }),
    body: zod_1.z.object({
        title: zod_1.z.string().min(5).max(100).optional(),
        description: zod_1.z.string().min(10).optional(),
        price: zod_1.z.number().min(0).optional(),
        isPublished: zod_1.z.boolean().optional(),
    }),
});
exports.createModuleSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: zod_1.z.string().uuid('Invalid course ID format'),
        title: zod_1.z.string().min(3, 'Module title must be at least 3 characters long'),
        description: zod_1.z.string().optional(),
        order: zod_1.z.number().int().min(1, 'Order must be a positive integer'),
    }),
});
exports.createMaterialSchema = zod_1.z.object({
    body: zod_1.z.object({
        moduleId: zod_1.z.string().uuid('Invalid module ID format'),
        title: zod_1.z.string().min(2, 'Material title must be at least 2 characters long'),
        fileUrl: zod_1.z.string().url('File URL must be valid'),
        fileKey: zod_1.z.string().min(1, 'File key is required'),
        fileType: zod_1.z.string().min(1, 'File type is required'), // e.g. "pdf", "video"
        size: zod_1.z.number().int().min(1, 'File size must be positive'),
    }),
});
exports.queryCourseCatalogSchema = zod_1.z.object({
    query: zod_1.z.object({
        subjectId: zod_1.z.string().uuid().optional(),
        search: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['price_asc', 'price_desc', 'newest']).default('newest'),
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    }),
});
//# sourceMappingURL=courses.validation.js.map