import { PaymentStatus, UserRole } from '../../types/enums';
import pool from '../../config/database';
import { AppError } from '../../common/errors/app-error';
import { RowDataPacket } from 'mysql2';

export class AnalyticsService {
  /**
   * Fetch platform-wide analytics stats (Admins only)
   */
  public async getAdminDashboardStats() {
    // 1. Total Platform Revenue (Successful payments)
    const [revenueRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COALESCE(SUM(amount), 0) AS total_revenue FROM payments WHERE status = ?',
      [PaymentStatus.SUCCESSFUL]
    );
    const totalRevenue = revenueRows[0].total_revenue;

    // 2. User Accounts Breakdown
    const [studentCountRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM users WHERE role = ?',
      [UserRole.STUDENT]
    );
    const [tutorCountRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM users WHERE role = ?',
      [UserRole.TUTOR]
    );
    const [activeTutorRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM tutor_profiles WHERE is_verified = ?',
      [true]
    );

    // 3. Courses and Enrollments count
    const [courseCountRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM courses'
    );
    const [enrollmentCountRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM enrollments'
    );

    // 4. Revenue grouped by Subject
    const [revenueBySubjectRows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.name AS subject, COALESCE(SUM(p.amount), 0) AS revenue
       FROM payments p
       JOIN courses c ON c.id = p.course_id
       JOIN subjects s ON s.id = c.subject_id
       WHERE p.status = ?
       GROUP BY s.name`,
      [PaymentStatus.SUCCESSFUL]
    );

    // 5. Recent Platform Payments
    const [recentPayments] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.amount, p.status, p.mpesa_receipt_number, p.created_at,
              u.email AS student_email, c.title AS course_title
       FROM payments p
       JOIN users u ON u.id = p.student_id
       JOIN courses c ON c.id = p.course_id
       ORDER BY p.created_at DESC
       LIMIT 5`
    );

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
      recentPayments: recentPayments.map((p: any) => ({
        ...p,
        student: { email: p.student_email },
        course: { title: p.course_title },
      })),
    };
  }

  /**
   * Fetch tutor-specific dashboard analytics (Tutors only)
   */
  public async getTutorDashboardStats(userId: string) {
    const [profileRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, competency_status, competency_score FROM tutor_profiles WHERE user_id = ?',
      [userId]
    );
    if (profileRows.length === 0) {
      throw AppError.notFound('Tutor profile not found.');
    }
    const profile = profileRows[0];

    // 1. Total Tutor Earnings (Successful payments for courses owned by tutor)
    const [earningsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(p.amount), 0) AS total_earnings
       FROM payments p
       JOIN courses c ON c.id = p.course_id
       WHERE p.status = ? AND c.tutor_id = ?`,
      [PaymentStatus.SUCCESSFUL, profile.id]
    );
    const totalEarnings = earningsRows[0].total_earnings;

    // 2. Student Enrollments in this tutor's courses
    const [enrollmentCountRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE c.tutor_id = ?`,
      [profile.id]
    );

    // 3. Breakdown of student counts per Course
    const [courseRows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.id, c.title, c.price, c.is_published,
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
       FROM courses c
       WHERE c.tutor_id = ?`,
      [profile.id]
    );

    const courseOutlines = courseRows.map((c: any) => ({
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

export default AnalyticsService;
