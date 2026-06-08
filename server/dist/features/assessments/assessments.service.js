"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentsService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
const email_service_1 = require("../../common/services/email.service");
class AssessmentsService {
    /**
     * Create an Assessment under a Course Module (Tutor Owner / Admin only)
     */
    async createAssessment(userId, role, data) {
        const targetModule = await prisma_1.prisma.module.findUnique({
            where: { id: data.moduleId },
        });
        if (!targetModule) {
            throw app_error_1.AppError.notFound('Target course module not found.');
        }
        // Verify course tutor ownership
        await this.verifyCourseOwnership(userId, role, targetModule.courseId);
        const assessment = await prisma_1.prisma.assessment.create({
            data,
        });
        logger_1.logger.info(`📝 Assessment "${assessment.title}" created under Module ID: ${data.moduleId}`);
        return assessment;
    }
    /**
     * Submit homework/answers for an Assessment (Enrolled Students only)
     */
    async submitAssessment(studentId, assessmentId, fileUrl, fileKey) {
        const assessment = await prisma_1.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                module: true,
            },
        });
        if (!assessment) {
            throw app_error_1.AppError.notFound('Assessment not found.');
        }
        const courseId = assessment.module.courseId;
        // Verify Student Enrollment
        const enrollment = await prisma_1.prisma.enrollment.findUnique({
            where: {
                studentId_courseId: { studentId, courseId },
            },
        });
        if (!enrollment) {
            throw app_error_1.AppError.forbidden('Access Denied: You must purchase/enroll in the course before submitting coursework.');
        }
        // Check for existing submissions
        const existingSubmission = await prisma_1.prisma.submission.findFirst({
            where: {
                assessmentId,
                studentId,
            },
        });
        if (existingSubmission) {
            if (existingSubmission.status === client_1.SubmissionStatus.GRADED) {
                throw app_error_1.AppError.badRequest('This assessment has already been graded. Submissions are locked.');
            }
            // Overwrite/Update existing draft submission
            const updatedSubmission = await prisma_1.prisma.submission.update({
                where: { id: existingSubmission.id },
                data: {
                    fileUrl,
                    fileKey,
                    createdAt: new Date(), // Reset timestamp to upload date
                },
            });
            logger_1.logger.info(`📝 Student ${studentId} resubmitted coursework for Assessment ID: ${assessmentId}`);
            return updatedSubmission;
        }
        // Create a new submission
        const submission = await prisma_1.prisma.submission.create({
            data: {
                assessmentId,
                studentId,
                fileUrl,
                fileKey,
                status: client_1.SubmissionStatus.SUBMITTED,
            },
        });
        logger_1.logger.info(`📝 Student ${studentId} submitted coursework for Assessment ID: ${assessmentId}`);
        return submission;
    }
    /**
     * Grade a student submission (Tutor Owner / Admin only)
     */
    async gradeSubmission(tutorUserId, role, submissionId, score, feedback) {
        const submission = await prisma_1.prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                assessment: {
                    include: {
                        module: true,
                    },
                },
                student: {
                    select: { email: true },
                },
            },
        });
        if (!submission) {
            throw app_error_1.AppError.notFound('Student submission not found.');
        }
        if (score > submission.assessment.maxScore) {
            throw app_error_1.AppError.badRequest(`Grade score (${score}) exceeds the maximum evaluation limit of ${submission.assessment.maxScore}.`);
        }
        // Verify Course ownership
        const courseId = submission.assessment.module.courseId;
        await this.verifyCourseOwnership(tutorUserId, role, courseId);
        // Update submission
        const gradedSubmission = await prisma_1.prisma.submission.update({
            where: { id: submissionId },
            data: {
                score,
                feedback,
                status: client_1.SubmissionStatus.GRADED,
                gradedById: tutorUserId,
            },
        });
        // Fetch course details for title reference
        const course = await prisma_1.prisma.course.findUnique({ where: { id: courseId } });
        // Trigger asynchronous grade notifications alert
        email_service_1.emailService.sendGradeNotification(submission.student.email, course?.title || 'EduConnect Course', submission.assessment.title, score, submission.assessment.maxScore, feedback);
        logger_1.logger.info(`🎓 Submission ID: ${submissionId} graded with ${score} marks by Tutor: ${tutorUserId}`);
        return gradedSubmission;
    }
    /**
     * Retrieve all submissions for an assessment (Tutors/Admins only)
     */
    async listSubmissions(userId, role, assessmentId) {
        const assessment = await prisma_1.prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: { module: true },
        });
        if (!assessment) {
            throw app_error_1.AppError.notFound('Assessment not found.');
        }
        // Ensure access permissions
        await this.verifyCourseOwnership(userId, role, assessment.module.courseId);
        return prisma_1.prisma.submission.findMany({
            where: { assessmentId },
            include: {
                student: {
                    select: { id: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Helper: Ensure Course owner is requesting action or Admin
     */
    async verifyCourseOwnership(userId, role, courseId) {
        const course = await prisma_1.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            throw app_error_1.AppError.notFound('Course not found.');
        }
        if (role === client_1.UserRole.ADMIN)
            return;
        const profile = await prisma_1.prisma.tutorProfile.findUnique({ where: { userId } });
        if (!profile || course.tutorId !== profile.id) {
            throw app_error_1.AppError.forbidden('Access Denied: You do not own this course.');
        }
    }
}
exports.AssessmentsService = AssessmentsService;
exports.default = AssessmentsService;
//# sourceMappingURL=assessments.service.js.map