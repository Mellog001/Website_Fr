"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const enums_1 = require("../../types/enums");
const database_1 = __importDefault(require("../../config/database"));
const app_error_1 = require("../../common/errors/app-error");
class AnalyticsService {
    /**
     * Fetch platform-wide analytics stats (Admins only)
     */
    async getAdminDashboardStats() {
        // 1. Total Platform Revenue (Successful payments)
        const [revenueRows] = await database_1.default.execute('SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM payments WHERE status = ?', [enums_1.PaymentStatus.SUCCESSFUL]);
        const totalRevenue = revenueRows[0].total_revenue;
        // 2. User Accounts Breakdown
        const [studentCountRows] = await database_1.default.execute('SELECT COUNT(*) AS count FROM users WHERE role = ?', [enums_1.UserRole.STUDENT]);
        const [tutorCountRows] = await database_1.default.execute('SELECT COUNT(*) AS count FROM users WHERE role = ?', [enums_1.UserRole.TUTOR]);
        const [activeTutorRows] = await database_1.default.execute('SELECT COUNT(*) AS count FROM tutor_profiles WHERE is_verified = ?', [true]);
        // 3. Courses and Enrollments count
        const [courseCountRows] = await database_1.default.execute('SELECT COUNT(*) AS count FROM courses');
        const [enrollmentCountRows] = await database_1.default.execute('SELECT COUNT(*) AS count FROM enrollments');
        // 4. Revenue grouped by Subject
        const [revenueBySubjectRows] = await database_1.default.execute(`SELECT s.name AS subject, COALESCE(SUM(p.amount), 0) AS revenue
       FROM payments p
       JOIN courses c ON c.id = p.course_id
       JOIN subjects s ON s.id = c.subject_id
       WHERE p.status = ?
       GROUP BY s.name`, [enums_1.PaymentStatus.SUCCESSFUL]);
        // 5. Recent Platform Payments
        const [recentPayments] = await database_1.default.execute(`SELECT p.id, p.amount, p.status, p.mpesa_receipt_number, p.created_at,
              u.email AS student_email, c.title AS course_title
       FROM payments p
       JOIN users u ON u.id = p.student_id
       JOIN courses c ON c.id = p.course_id
       ORDER BY p.created_at DESC
       LIMIT 5`);
        return {
            revenue: {
                totalGross: totalRevenue,
                bySubject: revenueBySubjectRows,
            },
            users: {
                totalStudents: studentCountRows[0].count,
                totalTutors: tutorCountRows[0].count,
                activeVerifiedTutors: activeTutorRows[0].count,
            },
            content: {
                totalCourses: courseCountRows[0].count,
                totalEnrollments: enrollmentCountRows[0].count,
            },
            recentPayments: recentPayments.map((p) => ({
                ...p,
                student: { email: p.student_email },
                course: { title: p.course_title },
            })),
        };
    }
    /**
     * Fetch tutor-specific dashboard analytics (Tutors only)
     */
    async getTutorDashboardStats(userId) {
        const [profileRows] = await database_1.default.execute('SELECT id, competency_status, competency_score FROM tutor_profiles WHERE user_id = ?', [userId]);
        if (profileRows.length === 0) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        const profile = profileRows[0];
        // 1. Total Tutor Earnings (Successful payments for courses owned by tutor)
        const [earningsRows] = await database_1.default.execute(`SELECT COALESCE(SUM(p.amount), 0) AS total_earnings
       FROM payments p
       JOIN courses c ON c.id = p.course_id
       WHERE p.status = ? AND c.tutor_id = ?`, [enums_1.PaymentStatus.SUCCESSFUL, profile.id]);
        const totalEarnings = earningsRows[0].total_earnings;
        // 2. Student Enrollments in this tutor's courses
        const [enrollmentCountRows] = await database_1.default.execute(`SELECT COUNT(*) AS count
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE c.tutor_id = ?`, [profile.id]);
        // 3. Breakdown of student counts per Course
        const [courseRows] = await database_1.default.execute(`SELECT c.id, c.title, c.price, c.is_published,
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
       FROM courses c
       WHERE c.tutor_id = ?`, [profile.id]);
        const courseOutlines = courseRows.map((c) => ({
            courseId: c.id,
            title: c.title,
            price: c.price,
            isPublished: c.is_published,
            enrolledCount: c.enrolled_count,
        }));
        return {
            tutorProfileId: profile.id,
            earnings: {
                totalGross: totalEarnings,
            },
            enrollments: {
                totalStudents: enrollmentCountRows[0].count,
            },
            courses: courseOutlines,
            competency: {
                status: profile.competency_status,
                score: profile.competency_score,
            },
        };
    }
}
exports.AnalyticsService = AnalyticsService;
exports.default = AnalyticsService;
//# sourceMappingURL=analytics.service.js.map