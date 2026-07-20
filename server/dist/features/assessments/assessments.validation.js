"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeSubmissionSchema = exports.submitAssessmentSchema = exports.createAssessmentSchema = void 0;
const zod_1 = require("zod");
exports.createAssessmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        moduleId: zod_1.z.string().uuid('Invalid module ID format'),
        title: zod_1.z.string().min(3, 'Title must be at least 3 characters long').max(150),
        description: zod_1.z.string().min(10, 'Description must be at least 10 characters long'),
        maxScore: zod_1.z.number().int().min(1, 'Max score must be at least 1'),
        fileUrl: zod_1.z.string().url('File URL must be valid').optional(),
        fileKey: zod_1.z.string().optional(),
    }),
});
exports.submitAssessmentSchema = zod_1.z.object({
    params: zod_1.z.object({
        assessmentId: zod_1.z.string().uuid('Invalid assessment ID format'),
    }),
    body: zod_1.z.object({
        fileUrl: zod_1.z.string().url('Submission file URL must be valid'),
        fileKey: zod_1.z.string().min(1, 'Submission file key is required'),
    }),
});
exports.gradeSubmissionSchema = zod_1.z.object({
    params: zod_1.z.object({
        submissionId: zod_1.z.string().uuid('Invalid submission ID format'),
    }),
    body: zod_1.z.object({
        score: zod_1.z.number().min(0, 'Score cannot be negative'),
        feedback: zod_1.z.string().min(5, 'Feedback must be at least 5 characters long').max(1000),
    }),
});
//# sourceMappingURL=assessments.validation.js.map