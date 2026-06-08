"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorsService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
class TutorsService {
    /**
     * Fetch tutor profile by User ID
     */
    async getProfile(userId) {
        const profile = await prisma_1.prisma.tutorProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        if (!profile) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        return profile;
    }
    /**
     * Update tutor bio and qualifications
     */
    async updateProfile(userId, data) {
        const profile = await prisma_1.prisma.tutorProfile.findUnique({ where: { userId } });
        if (!profile) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        const updatedProfile = await prisma_1.prisma.tutorProfile.update({
            where: { userId },
            data: {
                ...(data.bio !== undefined ? { bio: data.bio } : {}),
                ...(data.qualifications !== undefined ? { qualifications: data.qualifications } : {}),
            },
        });
        logger_1.logger.info(`📝 Tutor profile updated for user ${userId}`);
        return updatedProfile;
    }
    /**
     * Request a tutor competency test for a specific subject
     */
    async requestCompetencyTest(userId, subjectId) {
        const profile = await prisma_1.prisma.tutorProfile.findUnique({ where: { userId } });
        if (!profile) {
            throw app_error_1.AppError.notFound('Tutor profile not found. Complete profile details first.');
        }
        // Verify Subject exists
        const subject = await prisma_1.prisma.subject.findUnique({ where: { id: subjectId } });
        if (!subject) {
            throw app_error_1.AppError.notFound('Subject not found.');
        }
        // Check for any ongoing PENDING test for this subject
        const pendingTest = await prisma_1.prisma.tutorCompetencyTest.findFirst({
            where: {
                tutorProfileId: profile.id,
                subjectId,
                status: client_1.CompetencyStatus.PENDING,
            },
        });
        if (pendingTest) {
            throw app_error_1.AppError.conflict('You already have a pending evaluation for this subject.');
        }
        const test = await prisma_1.prisma.tutorCompetencyTest.create({
            data: {
                tutorProfileId: profile.id,
                subjectId,
                status: client_1.CompetencyStatus.PENDING,
            },
            include: {
                subject: {
                    select: { name: true, code: true },
                },
            },
        });
        logger_1.logger.info(`📝 Competency test requested by Tutor ${profile.id} for Subject ${subject.name}`);
        return test;
    }
    /**
     * List all competency tests based on user roles
     */
    async listCompetencyTests(userId, role) {
        if (role === client_1.UserRole.ADMIN) {
            // Admins see all tests
            return prisma_1.prisma.tutorCompetencyTest.findMany({
                include: {
                    tutorProfile: {
                        include: {
                            user: {
                                select: { email: true },
                            },
                        },
                    },
                    subject: {
                        select: { name: true, code: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        else {
            // Tutors only see their own tests
            const profile = await prisma_1.prisma.tutorProfile.findUnique({ where: { userId } });
            if (!profile) {
                throw app_error_1.AppError.notFound('Tutor profile not found.');
            }
            return prisma_1.prisma.tutorCompetencyTest.findMany({
                where: { tutorProfileId: profile.id },
                include: {
                    subject: {
                        select: { name: true, code: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
    }
    /**
     * Grade a pending competency test (Admin only)
     */
    async gradeCompetencyTest(adminUserId, testId, score, status, feedback) {
        const test = await prisma_1.prisma.tutorCompetencyTest.findUnique({
            where: { id: testId },
        });
        if (!test) {
            throw app_error_1.AppError.notFound('Competency test not found.');
        }
        if (test.status !== client_1.CompetencyStatus.PENDING) {
            throw app_error_1.AppError.conflict('This competency test has already been graded.');
        }
        // Perform atomic update: grade the test and update the tutor profile status
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const gradedTest = await tx.tutorCompetencyTest.update({
                where: { id: testId },
                data: {
                    score,
                    status,
                    feedback,
                    gradedById: adminUserId,
                },
            });
            // Update Tutor Profile overall status
            await tx.tutorProfile.update({
                where: { id: test.tutorProfileId },
                data: {
                    competencyScore: score,
                    competencyStatus: status,
                },
            });
            return gradedTest;
        });
        logger_1.logger.info(`🎓 Competency test ${testId} graded [${status}] with score ${score}% by Admin ${adminUserId}`);
        return result;
    }
    /**
     * Verify/Approve a tutor profile (Admin only)
     */
    async verifyTutor(adminUserId, profileId, isVerified) {
        const profile = await prisma_1.prisma.tutorProfile.findUnique({
            where: { id: profileId },
        });
        if (!profile) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        if (isVerified && profile.competencyStatus !== client_1.CompetencyStatus.PASSED) {
            throw app_error_1.AppError.badRequest('Cannot verify tutor. Tutor must pass a competency test first.');
        }
        const updatedProfile = await prisma_1.prisma.tutorProfile.update({
            where: { id: profileId },
            data: {
                isVerified,
                verifiedAt: isVerified ? new Date() : null,
                verifiedById: isVerified ? adminUserId : null,
            },
        });
        logger_1.logger.info(`🛡️ Tutor verification status set to ${isVerified} for Profile ${profileId} by Admin ${adminUserId}`);
        return updatedProfile;
    }
}
exports.TutorsService = TutorsService;
exports.default = TutorsService;
//# sourceMappingURL=tutors.service.js.map