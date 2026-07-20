"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTutorSchema = exports.gradeCompetencyTestSchema = exports.requestCompetencyTestSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../../types/enums");
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        bio: zod_1.z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
        qualifications: zod_1.z.array(zod_1.z.string().url('Qualifications must be valid URLs')).optional(),
    }),
});
exports.requestCompetencyTestSchema = zod_1.z.object({
    body: zod_1.z.object({
        subjectId: zod_1.z.string().uuid('Invalid subject ID format'),
        submissionFileUrl: zod_1.z.string().url('Submission file URL must be a valid URL'),
        submissionFileKey: zod_1.z.string().min(1, 'Submission file key is required'),
    }),
});
exports.gradeCompetencyTestSchema = zod_1.z.object({
    params: zod_1.z.object({
        testId: zod_1.z.string().uuid('Invalid competency test ID format'),
    }),
    body: zod_1.z.object({
        score: zod_1.z.number().min(0, 'Score cannot be negative').max(100, 'Max score is 100'),
        status: zod_1.z.enum([enums_1.CompetencyStatus.PASSED, enums_1.CompetencyStatus.FAILED], {
            errorMap: () => ({ message: 'Status must be either PASSED or FAILED' }),
        }),
        feedback: zod_1.z.string().min(5, 'Feedback must be at least 5 characters long').max(1000),
    }),
});
exports.verifyTutorSchema = zod_1.z.object({
    params: zod_1.z.object({
        profileId: zod_1.z.string().uuid('Invalid profile ID format'),
    }),
    body: zod_1.z.object({
        isVerified: zod_1.z.boolean({
            required_error: 'Verification flag is required',
        }),
    }),
});
//# sourceMappingURL=tutors.validation.js.map