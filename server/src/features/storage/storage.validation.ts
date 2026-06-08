import { z } from 'zod';

export const getUploadUrlSchema = z.object({
  body: z.object({
    filename: z.string().min(1, 'Filename is required'),
    contentType: z.string().min(1, 'Content-Type is required'),
    folder: z.enum(['qualifications', 'materials', 'assessments', 'submissions', 'avatars'], {
      errorMap: () => ({ message: 'Invalid target folder directory structure.' }),
    }),
  }),
});
