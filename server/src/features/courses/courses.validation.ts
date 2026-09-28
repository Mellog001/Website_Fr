import { z } from 'zod';

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Subject name must be at least 2 characters'),
    code: z.string().min(2, 'Code must be at least 2 characters').toUpperCase(),
    description: z.string().max(500).optional(),
  }),
});

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters long').max(100),
    description: z.string().min(10, 'Description must be at least 10 characters long'),
    price: z.number().min(0, 'Price cannot be negative'),
    subjectId: z.string().uuid('Invalid subject ID format'),
  }),
});

export const updateCourseSchema = z.object({
  params: z.object({
    courseId: z.string().uuid('Invalid course ID format'),
  }),
  body: z.object({
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(10).optional(),
    price: z.number().min(0).optional(),
    isPublished: z.boolean().optional(),
    imageUrl: z.string().url().optional(),
  }),
});

export const createModuleSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Invalid course ID format'),
    title: z.string().min(3, 'Module title must be at least 3 characters long'),
    description: z.string().optional(),
    order: z.number().int().min(1, 'Order must be a positive integer'),
  }),
});

export const createMaterialSchema = z.object({
  body: z.object({
    moduleId: z.string().uuid('Invalid module ID format'),
    title: z.string().min(2, 'Material title must be at least 2 characters long'),
    fileUrl: z.string().url('File URL must be valid'),
    fileKey: z.string().min(1, 'File key is required'),
    fileType: z.string().min(1, 'File type is required'), // e.g. "pdf", "video"
    size: z.number().int().min(1, 'File size must be positive'),
  }),
});

export const queryCourseCatalogSchema = z.object({
  query: z.object({
    subjectId: z.string().uuid().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['price_asc', 'price_desc', 'newest']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});
