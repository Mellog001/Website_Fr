// import { z } from 'zod';

// export const getUploadUrlSchema = z.object({
//   body: z.object({
//     filename: z.string().min(1, 'Filename is required'),
//     contentType: z.string().min(1, 'Content-Type is required'),
//     folder: z.enum(['qualifications', 'materials', 'assessments', 'submissions', 'avatars'], {
//       errorMap: () => ({ message: 'Invalid target folder directory structure.' }),
//     }),
//   }),
// });


import { z } from 'zod';

export const getUploadUrlSchema = z.object({
  body: z.object({
    fileName: z.string().min(1, 'File name is required'),
    fileType: z.string().min(1, 'File type is required'),
    fileSize: z.number().positive('File size must be positive'),
    folder: z.enum(['avatars', 'qualifications', 'courses', 'materials', 'assessments', 'submissions']).default('courses'),
    mimeType: z.string().optional(),
    type: z.string().optional(), // Alias for folder
  }),
});