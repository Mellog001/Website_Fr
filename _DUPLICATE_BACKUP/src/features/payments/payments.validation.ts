import { z } from 'zod';

export const initiateStkPushSchema = z.object({
  body: z.object({
    courseId: z.string().uuid('Invalid course ID format'),
    phoneNumber: z.string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(12, 'Phone number must not exceed 12 digits')
      .regex(/^(?:254|\+254|0)?(7|1)([0-9]{8})$/, 'Invalid Kenyan phone number format. Must be like 07XXXXXXXX or 2547XXXXXXXX.'),
  }),
});
