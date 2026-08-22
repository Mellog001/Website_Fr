import { z } from 'zod';

export const createAssessmentSchema = z.object({
  body: z.object({
    moduleId: z.string().uuid('Invalid module ID format'),
    title: z.string().min(3, 'Title must be at least 3 characters long').max(150),
    description: z.string().min(10, 'Description must be at least 10 characters long'),
    maxScore: z.number().int().min(1, 'Max score must be at least 1'),
    fileUrl: z.string().url('File URL must be valid').optional(),
    fileKey: z.string().optional(),
  }),
});

export const submitAssessmentSchema = z.object({
  params: z.object({
    assessmentId: z.string().uuid('Invalid assessment ID format'),
  }),
  body: z.object({
    fileUrl: z.string().url('Submission file URL must be valid'),
    fileKey: z.string().min(1, 'Submission file key is required'),
  }),
});

export const gradeSubmissionSchema = z.object({
  params: z.object({
    submissionId: z.string().uuid('Invalid submission ID format'),
  }),
  body: z.object({
    score: z.number().min(0, 'Score cannot be negative'),
    feedback: z.string().min(5, 'Feedback must be at least 5 characters long').max(1000),
  }),
});
