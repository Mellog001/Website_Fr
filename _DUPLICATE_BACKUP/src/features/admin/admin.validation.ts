import { z } from 'zod';

export const suspendUserSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    isSuspended: z.boolean({
      required_error: 'Suspension flag (isSuspended) is required',
    }),
  }),
});
