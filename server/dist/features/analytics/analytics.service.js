"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
const app_error_1 = require("../../common/errors/app-error");
class AnalyticsService {
    /**
     * Fetch platform-wide analytics stats (Admins only)
     */
    async getAdminDashboardStats() {
        // 1. Total Platform Revenue (Successful payments)
        const revenueAgg = await prisma_1.prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: client_1.PaymentStatus.SUCCESSFUL },
        });
        const totalRevenue = revenueAgg._sum.amount || 0;
        // 2. User Accounts Breakdown
        const studentCount = await prisma_1.prisma.user.count({ where: { role: client_1.UserRole.STUDENT } });
        const tutorCount = await prisma_1.prisma.user.count({ where: { role: client_1.UserRole.TUTOR } });
        const activeTutors = await prisma_1.prisma.tutorProfile.count({ where: { isVerified: true } });
        // 3. Courses and Enrollments count
        const totalCourses = await prisma_1.prisma.course.count();
        const totalEnrollments = await prisma_1.prisma.enrollment.count();
        // 4. Revenue grouped by Subject
        const subjectRevenueList = await prisma_1.prisma.payment.findMany({
            where: { status: client_1.PaymentStatus.SUCCESSFUL },
            include: {
                course: {
                    select: {
                        subject: { select: { name: true, code: true } },
                    },
                },
            },
        });
        const revenueBySubjectMap = {};
        for (const payment of subjectRevenueList) {
            const subjectName = payment.course.subject.name;
            revenueBySubjectMap[subjectName] = (revenueBySubjectMap[subjectName] || 0) + Number(payment.amount);
        }
        const revenueBySubject = Object.entries(revenueBySubjectMap).map(([subject, revenue]) => ({
            subject,
            revenue,
        }));
        // 5. Recent Platform Payments
        const recentPayments = await prisma_1.prisma.payment.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                amount: true,
                status: true,
                mpesaReceiptNumber: true,
                createdAt: true,
                student: { select: { email: true } },
                course: { select: { title: true } },
            },
        });
        return {
            revenue: {
                totalGross: totalRevenue,
                bySubject: revenueBySubject,
            },
            users: {
                totalStudents: studentCount,
                totalTutors: tutorCount,
                activeVerifiedTutors: activeTutors,
            },
            content: {
                totalCourses,
                totalEnrollments,
            },
            recentPayments,
        };
    }
    /**
     * Fetch tutor-specific dashboard analytics (Tutors only)
     */
    async getTutorDashboardStats(userId) {
        const profile = await prisma_1.prisma.tutorProfile.findUnique({ where: { userId } });
        if (!profile) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        // 1. Total Tutor Earnings (Successful payments for courses owned by tutor)
        const earningsAgg = await prisma_1.prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
                status: client_1.PaymentStatus.SUCCESSFUL,
                course: { tutorId: profile.id },
            },
        });
        const totalEarnings = earningsAgg._sum.amount || 0;
        // 2. Student Enrollments in this tutor's courses
        const studentEnrollments = await prisma_1.prisma.enrollment.count({
            where: {
                course: { tutorId: profile.id },
            },
        });
        // 3. Breakdown of student counts per Course
        const tutorCourses = await prisma_1.prisma.course.findMany({
            where: { tutorId: profile.id },
            select: {
                id: true,
                title: true,
                price: true,
                isPublished: true,
                _count: {
                    select: { enrollments: true },
                },
            },
        });
        const courseOutlines = tutorCourses.map((c) => ({
            courseId: c.id,
            title: c.title,
            price: c.price,
            isPublished: c.isPublished,
            enrolledCount: c._count.enrollments,
        }));
        return {
            tutorProfileId: profile.id,
            earnings: {
                totalGross: totalEarnings,
            },
            enrollments: {
                totalStudents: studentEnrollments,
            },
            courses: courseOutlines,
            competency: {
                status: profile.competencyStatus,
                score: profile.competencyScore,
            },
        };
    }
}
exports.AnalyticsService = AnalyticsService;
exports.default = AnalyticsService;
//# sourceMappingURL=analytics.service.js.map