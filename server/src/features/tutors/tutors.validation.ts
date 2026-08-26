import { z } from 'zod';
import { CompetencyStatus } from '../../types/enums';

export const updateProfileSchema = z.object({
  body: z.object({
    bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
    qualifications: z.array(z.string().url('Qualifications must be valid URLs')).optional(),
  }),
});

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Subject name must be at least 2 characters').max(255),
    code: z.string().min(2, 'Code must be at least 2 characters').max(50).toUpperCase().optional(),
    description: z.string().max(500, 'Description too long').optional(),
  }),
});

export const requestCompetencyTestSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid('Invalid subject ID format'),
    submissionFileUrl: z.string().url('Submission file URL must be a valid URL'),
    submissionFileKey: z.string().min(1, 'Submission file key is required'),
  }),
});

export const gradeCompetencyTestSchema = z.object({
  params: z.object({
    testId: z.string().uuid('Invalid competency test ID format'),
  }),
  body: z.object({
    score: z.number().min(0, 'Score cannot be negative').max(100, 'Max score is 100'),
    status: z.enum([CompetencyStatus.PASSED, CompetencyStatus.FAILED], {
      errorMap: () => ({ message: 'Status must be either PASSED or FAILED' }),
    }),
    feedback: z.string().min(5, 'Feedback must be at least 5 characters long').max(1000),
  }),
});

export const verifyTutorSchema = z.object({
  params: z.object({
    profileId: z.string().uuid('Invalid profile ID format'),
  }),
  body: z.object({
    isVerified: z.boolean({
      required_error: 'Verification flag is required',
    }),
  }),
});