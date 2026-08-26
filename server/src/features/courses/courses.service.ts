import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../../types/enums';
import pool from '../../config/database';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../config/logger';
import { RowDataPacket } from 'mysql2';
import emailService from '../../common/services/email.service';

export class CoursesService {
  /**
   * Create a new subject (Admin only)
   */
  public async createSubject(data: { name: string; code: string; description?: string }) {
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM subjects WHERE code = ?',
      [data.code]
    );
    if (existing.length > 0) {
      throw AppError.conflict(`Subject code [${data.code}] already exists.`);
    }

    const id = uuidv4();
    await pool.execute(
      'INSERT INTO subjects (id, name, code, description) VALUES (?, ?, ?, ?)',
      [id, data.name, data.code, data.description || null]
    );

    const subject = { id, ...data };
    logger.info(`📚 Subject created: ${subject.name} [${subject.code}]`);
    return subject;
  }

  /**
   * List all subjects
   */
  public async listSubjects() {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM subjects ORDER BY name ASC'
    );
    return rows;
  }

  /**
   * Create a new course (Verified Tutors only)
   */
  public async createCourse(
    userId: string,
    data: {
      title: string;
      description: string;
      price: number;
      subjectId: string;
      imageUrl?: string | null;
    }
  ) {
    const [profileRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, is_verified FROM tutor_profiles WHERE user_id = ?',
      [userId]
    );
    const profile = profileRows[0];
    if (!profile) {
      throw AppError.notFound('Tutor profile not found.');
    }

    if (!profile.is_verified) {
      throw AppError.forbidden('Access Denied: Your tutor profile must be approved/verified by an Admin before creating courses.');
    }

    // Verify Subject
    const [subjectRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name FROM subjects WHERE id = ?',
      [data.subjectId]
    );
    if (subjectRows.length === 0) {
      throw AppError.notFound('Subject not found.');
    }

    const courseId = uuidv4();
    await pool.execute(
      `INSERT INTO courses (id, title, description, price, subject_id, tutor_id, is_published, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        data.title,
        data.description,
        data.price,
        data.subjectId,
        profile.id,
        false,
        data.imageUrl || null
      ]
    );

    // Fetch the created course with subject info
    const [courseRows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, s.name as subject_name 
       FROM courses c
       LEFT JOIN subjects s ON s.id = c.subject_id
       WHERE c.id = ?`,
      [courseId]
    );

    logger.info(`🎓 Course created: "${data.title}" by Tutor: ${profile.id}`);
    return courseRows[0];
  }

  /**
   * Update Course details (Tutor owner / Admins only)
   */
  public async updateCourse(
    userId: string,
    role: UserRole,
    courseId: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      isPublished?: boolean;
      imageUrl?: string | null;
    }
  ) {
    const [courseRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM courses WHERE id = ?',
      [courseId]
    );
    const course = courseRows[0];
    if (!course) {
      throw AppError.notFound('Course not found.');
    }

    // Enforce authorization checks
    if (role !== UserRole.ADMIN) {
      const [profileRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM tutor_profiles WHERE user_id = ?',
        [userId]
      );
      const profile = profileRows[0];
      if (!profile || course.tutor_id !== profile.id) {
        throw AppError.forbidden('Access Denied: You do not own this course.');
      }
    }

    // Build dynamic UPDATE
    const fields: string[] = [];
    const values: any[] = [];
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
    if (data.isPublished !== undefined) { fields.push('is_published = ?'); values.push(data.isPublished); }
    if (data.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(data.imageUrl); }

    if (fields.length > 0) {
      values.push(courseId);
      await pool.execute(
        `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Fetch updated course
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, s.name as subject_name 
       FROM courses c
       LEFT JOIN subjects s ON s.id = c.subject_id
       WHERE c.id = ?`,
      [courseId]
    );

    logger.info(`🎓 Course updated: "${updatedRows[0]?.title}" [ID: ${courseId}]`);
    return updatedRows[0];
  }

  /**
   * Add a Module to a Course
   */
  public async createModule(
    userId: string,
    role: UserRole,
    data: { courseId: string; title: string; description?: string; order: number }
  ) {
    // Validate Course Ownership
    await this.verifyCourseOwnership(userId, role, data.courseId);

    const moduleId = uuidv4();
    await pool.execute(
      'INSERT INTO modules (id, course_id, title, description, `order`) VALUES (?, ?, ?, ?, ?)',
      [moduleId, data.courseId, data.title, data.description || null, data.order]
    );

    const module = { id: moduleId, ...data };
    logger.info(`📦 Module "${module.title}" added to Course ID: ${data.courseId}`);
    return module;
  }

  /**
   * Add a Material resource to a Module
   */
  public async createMaterial(
    userId: string,
    role: UserRole,
    data: { moduleId: string; title: string; fileUrl: string; fileKey: string; fileType: string; size: number }
  ) {
    const [moduleRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, course_id FROM modules WHERE id = ?',
      [data.moduleId]
    );

    if (moduleRows.length === 0) {
      throw AppError.notFound('Module not found.');
    }

    // Validate ownership of the course enclosing this module
    await this.verifyCourseOwnership(userId, role, moduleRows[0].course_id);

    const materialId = uuidv4();
    await pool.execute(
      'INSERT INTO materials (id, module_id, title, file_url, file_key, file_type, size) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [materialId, data.moduleId, data.title, data.fileUrl, data.fileKey, data.fileType, data.size]
    );

    const material = { id: materialId, ...data };
    logger.info(`📎 Material "${material.title}" [Type: ${material.fileType}] uploaded under Module ID: ${data.moduleId}`);
    return material;
  }

  /**
   * Query Course catalog with filters, search, sorting and pagination
   */
  public async getCatalog(
    query: { subjectId?: string; search?: string; sortBy: string; page: number; limit: number },
    currentUser?: { id: string; role: UserRole }
  ) {
    const { subjectId, search, sortBy, page, limit } = query;
    const offset = (page - 1) * limit;

    // Build WHERE clauses dynamically
    const conditions: string[] = [];
    const params: any[] = [];

    // Standard users (students, guests) only see published courses
    if (!currentUser || currentUser.role === UserRole.STUDENT) {
      conditions.push('c.is_published = ?');
      params.push(true);
    }

    if (subjectId) {
      conditions.push('c.subject_id = ?');
      params.push(subjectId);
    }

    if (search) {
      conditions.push('(c.title LIKE ? OR c.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Determine sorting
    let orderBy = 'c.created_at DESC';
    if (sortBy === 'price_asc') orderBy = 'c.price ASC';
    else if (sortBy === 'price_desc') orderBy = 'c.price DESC';

    // Count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM courses c ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Ensure limit/offset are real integers
    const safeLimit = Number.isInteger(Number(limit)) ? Number(limit) : 10;
    const safeOffset = Number.isInteger(Number(offset)) ? Number(offset) : 0;

    // Fetch courses with subject and tutor info
    const [courses] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, 
              s.name AS subject_name, s.code AS subject_code,
              tp.id AS tutor_profile_id, u.email AS tutor_email
       FROM courses c
       LEFT JOIN subjects s ON s.id = c.subject_id
       LEFT JOIN tutor_profiles tp ON tp.id = c.tutor_id
       LEFT JOIN users u ON u.id = tp.user_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    // Map to expected shape
    const mapped = courses.map((c: any) => ({
      ...c,
      subject: { name: c.subject_name, code: c.subject_code },
      tutor: { id: c.tutor_profile_id, user: { email: c.tutor_email } },
    }));

    return {
      courses: mapped,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Course details and outline (Modules & Material headers)
   */
  public async getCourseDetails(courseId: string, currentUserId?: string, currentUserRole?: UserRole) {
    // Fetch course with subject and tutor
    const [courseRows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, 
              s.id AS subject_id_ref, s.name AS subject_name, s.code AS subject_code, s.description AS subject_desc,
              tp.id AS tutor_profile_id, tp.user_id AS tutor_user_id, tp.bio AS tutor_bio, tp.is_verified AS tutor_is_verified,
              u.email AS tutor_email
       FROM courses c
       LEFT JOIN subjects s ON s.id = c.subject_id
       LEFT JOIN tutor_profiles tp ON tp.id = c.tutor_id
       LEFT JOIN users u ON u.id = tp.user_id
       WHERE c.id = ?`,
      [courseId]
    );

    if (courseRows.length === 0) {
      throw AppError.notFound('Course not found.');
    }

    const courseRow = courseRows[0];

    // Fetch modules
    const [moduleRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM modules WHERE course_id = ? ORDER BY `order` ASC',
      [courseId]
    );

    // Fetch materials for each module
    const modulesWithMaterials = [];
    for (const mod of moduleRows) {
      const [materialRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, title, file_type, size FROM materials WHERE module_id = ?',
        [mod.id]
      );
      modulesWithMaterials.push({
        ...mod,
        materials: materialRows,
      });
    }

    const course = {
      ...courseRow,
      subject: {
        id: courseRow.subject_id_ref,
        name: courseRow.subject_name,
        code: courseRow.subject_code,
        description: courseRow.subject_desc,
      },
      tutor: {
        id: courseRow.tutor_profile_id,
        userId: courseRow.tutor_user_id,
        bio: courseRow.tutor_bio,
        isVerified: courseRow.tutor_is_verified,
        user: { email: courseRow.tutor_email },
      },
      modules: modulesWithMaterials,
    };

    // Determine enrollment status
    let isEnrolled = false;
    if (currentUserId && currentUserRole === UserRole.STUDENT) {
      const [enrollmentRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?',
        [currentUserId, courseId]
      );
      isEnrolled = enrollmentRows.length > 0 && enrollmentRows[0].status === 'ACTIVE';
    } else if (currentUserRole === UserRole.ADMIN) {
      isEnrolled = true;
    } else if (currentUserId) {
      // Check if tutor owns course
      const [profileRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM tutor_profiles WHERE user_id = ?',
        [currentUserId]
      );
      if (profileRows.length > 0 && courseRow.tutor_id === profileRows[0].id) {
        isEnrolled = true;
      }
    }

    return {
      course,
      isEnrolled,
    };
  }

  /**
   * Helper: Ensure Course owner is requesting action or Admin
   */
  private async verifyCourseOwnership(userId: string, role: UserRole, courseId: string) {
    const [courseRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, tutor_id FROM courses WHERE id = ?',
      [courseId]
    );
    if (courseRows.length === 0) {
      throw AppError.notFound('Course not found.');
    }

    if (role === UserRole.ADMIN) return;

    const [profileRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM tutor_profiles WHERE user_id = ?',
      [userId]
    );
    if (profileRows.length === 0 || courseRows[0].tutor_id !== profileRows[0].id) {
      throw AppError.forbidden('Access Denied: You do not own this course.');
    }
  }

  // ============================================================
  // ENROLLMENT METHODS
  // ============================================================

  /**
   * Enroll a student in a course (creates pending enrollment and sends email)
   */
  public async enrollInCourse(userId: string, courseId: string) {
    // Check if course exists and is published
    const [courseRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, title, price, tutor_id, description FROM courses WHERE id = ? AND is_published = true',
      [courseId]
    );

    if (courseRows.length === 0) {
      throw AppError.notFound('Course not found or not available');
    }

    const course = courseRows[0];

    // Check if already enrolled or pending
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (existing.length > 0) {
      const status = existing[0].status;
      if (status === 'ACTIVE' || status === 'COMPLETED') {
        throw AppError.conflict('You are already enrolled in this course');
      } else if (status === 'PENDING') {
        throw AppError.conflict('You already have a pending enrollment request for this course');
      }
    }

    // Get student details - using email only (no username column)
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      throw AppError.notFound('User not found');
    }

    const student = userRows[0];
    // Use email prefix as display name since there's no username column
    const studentName = student.email.split('@')[0];

    // Create enrollment with PENDING status
    const enrollmentId = uuidv4();
    await pool.execute(
      `INSERT INTO enrollments (id, student_id, course_id, status, progress) 
       VALUES (?, ?, ?, 'PENDING', 0)`,
      [enrollmentId, userId, courseId]
    );

    logger.info(`📝 Enrollment request created: ${enrollmentId} for user ${userId} in course ${courseId}`);

    // Send email with payment instructions
    await this.sendEnrollmentEmail(
      student.email,
      studentName,
      course.title,
      course.price,
      course.description,
      enrollmentId
    );

    return {
      enrollmentId,
      status: 'PENDING',
      message: 'Check your email for payment instructions',
      courseTitle: course.title,
      amount: course.price
    };
  }

  /**
   * Send enrollment confirmation email with payment details
   */
  private async sendEnrollmentEmail(
    studentEmail: string,
    studentName: string,
    courseTitle: string,
    amount: number,
    courseDescription: string,
    enrollmentId: string
  ) {
    try {
      // Ensure amount is a number
      const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount;
      const formattedAmount = amountNumber.toFixed(2);
      
      const paymentInstructions = `
        <h3>📚 Course: ${courseTitle}</h3>
        <p><strong>Amount to Pay:</strong> KES ${formattedAmount}</p>

        <h4>📝 Payment Instructions:</h4>
        <ol>
          <li><strong>Bank:</strong> Equity Bank</li>
          <li><strong>Account Name:</strong> EduConnect Ltd</li>
          <li><strong>Account Number:</strong> 1234567890</li>
          <li><strong>Reference:</strong> ENR-${enrollmentId.substring(0, 8)}</li>
        </ol>

        <h4>📱 M-Pesa (Alternative):</h4>
        <ul>
          <li><strong>Paybill Number:</strong> 123456</li>
          <li><strong>Account Number:</strong> ENR-${enrollmentId.substring(0, 8)}</li>
        </ul>

        <h4>⚠️ Next Steps:</h4>
        <ol>
          <li>Make the payment using the instructions above</li>
          <li>Send proof of payment to <strong>payments@educonnect.com</strong></li>
          <li>Wait for admin to verify and activate your enrollment</li>
          <li>You will receive a confirmation email once activated</li>
        </ol>

        <p style="color: #e65100; font-weight: bold;">Note: Your enrollment will be activated within 24-48 hours after payment confirmation.</p>

        <hr>
        <p>If you have any questions, please contact support@educonnect.com</p>
      `;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2c3e50; text-align: center;">📚 Enrollment Confirmation</h2>
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Your enrollment request for <strong>${courseTitle}</strong> has been received.</p>

          ${paymentInstructions}

          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Enrollment ID:</strong> ${enrollmentId}</p>
            <p style="margin: 5px 0 0 0;"><strong>Amount:</strong> KES ${formattedAmount}</p>
          </div>

          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #7f8c8d; font-size: 12px;">© 2024 EduConnect. All rights reserved.</p>
          </div>
        </div>
      `;

      await emailService.sendEmail(
        studentEmail,
        `📚 Enrollment Request - ${courseTitle}`,
        `Enrollment Request for ${courseTitle}`,
        emailHtml
      );

      // Also send admin notification
      await this.sendAdminNotification(studentEmail, studentName, courseTitle, enrollmentId);

    } catch (error) {
      logger.error(`Failed to send enrollment email to ${studentEmail}:`, error);
      // Don't throw - email failure shouldn't stop enrollment
    }
  }

  /**
   * Send admin notification about new enrollment
   */
  private async sendAdminNotification(studentEmail: string, studentName: string, courseTitle: string, enrollmentId: string) {
    try {
      // Get admin emails from database
      const [adminRows] = await pool.execute<RowDataPacket[]>(
        'SELECT email FROM users WHERE role = ?',
        ['ADMIN']
      );

      const adminEmails = adminRows.map((row: any) => row.email);

      if (adminEmails.length === 0) return;

      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>📢 New Enrollment Request</h2>
          <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
          <p><strong>Course:</strong> ${courseTitle}</p>
          <p><strong>Enrollment ID:</strong> ${enrollmentId}</p>
          <p><strong>Status:</strong> PENDING</p>
          <p>Please review and confirm payment to activate the student.</p>
          <p><a href="http://localhost:5500/admin-dashboard.html">Go to Admin Dashboard</a></p>
        </div>
      `;

      await emailService.sendEmail(
        adminEmails.join(','),
        `📢 New Enrollment Request - ${courseTitle}`,
        `New enrollment request from ${studentName}`,
        adminHtml
      );

    } catch (error) {
      logger.error('Failed to send admin notification:', error);
    }
  }

  /**
   * Get enrollment status for a user
   */
  public async getEnrollmentStatus(userId: string, courseId: string) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status, progress, created_at, updated_at FROM enrollments WHERE student_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (rows.length === 0) {
      return {
        isEnrolled: false,
        status: null,
        canAccess: false
      };
    }

    const enrollment = rows[0];
    const isActive = enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED';

    return {
      isEnrolled: isActive,
      canAccess: isActive,
      status: enrollment.status,
      progress: enrollment.progress,
      enrolledAt: enrollment.created_at,
      updatedAt: enrollment.updated_at
    };
  }

  /**
   * Activate a student's enrollment (Admin only)
   */
  public async activateEnrollment(adminId: string, enrollmentId: string) {
    // Check if enrollment exists and is pending
    const [enrollmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, student_id, course_id, status FROM enrollments WHERE id = ?',
      [enrollmentId]
    );

    if (enrollmentRows.length === 0) {
      throw AppError.notFound('Enrollment not found');
    }

    const enrollment = enrollmentRows[0];

    if (enrollment.status !== 'PENDING') {
      throw AppError.conflict(`Cannot activate enrollment with status: ${enrollment.status}`);
    }

    // Update enrollment to ACTIVE
    await pool.execute(
      'UPDATE enrollments SET status = "ACTIVE", updated_at = NOW() WHERE id = ?',
      [enrollmentId]
    );

    // Get student details - using email only
    const [studentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email FROM users WHERE id = ?',
      [enrollment.student_id]
    );

    const [courseRows] = await pool.execute<RowDataPacket[]>(
      'SELECT title FROM courses WHERE id = ?',
      [enrollment.course_id]
    );

    const student = studentRows[0];
    const course = courseRows[0];

    // Send confirmation email to student
    if (student && course) {
      try {
        const studentName = student.email.split('@')[0];

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #27ae60;">✅ Enrollment Activated!</h2>
            <p>Dear <strong>${studentName}</strong>,</p>
            <p>Your enrollment for <strong>${course.title}</strong> has been <strong style="color: #27ae60;">ACTIVATED</strong>!</p>
            <p>You can now start learning:</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="http://localhost:5500/learn.html?course=${enrollment.course_id}" style="display: inline-block; background: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Start Learning</a>
            </p>
            <p>Thank you for choosing EduConnect!</p>
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #7f8c8d; font-size: 12px;">© 2024 EduConnect. All rights reserved.</p>
            </div>
          </div>
        `;

        await emailService.sendEmail(
          student.email,
          `✅ Enrollment Activated - ${course.title}`,
          `Your enrollment for ${course.title} has been activated`,
          emailHtml
        );

        logger.info(`📧 Activation email sent to ${student.email}`);
      } catch (error) {
        logger.error(`Failed to send activation email:`, error);
      }
    }

    return {
      enrollmentId,
      status: 'ACTIVE',
      message: 'Enrollment activated successfully'
    };
  }

  /**
   * Get all pending enrollments (Admin only)
   */
  public async getPendingEnrollments(adminId: string) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        e.id as enrollment_id,
        e.status,
        e.progress,
        e.created_at,
        u.id as student_id,
        u.email as student_email,
        c.id as course_id,
        c.title as course_title,
        c.price as course_price
      FROM enrollments e
      JOIN users u ON u.id = e.student_id
      JOIN courses c ON c.id = e.course_id
      WHERE e.status = 'PENDING'
      ORDER BY e.created_at DESC`
    );

    return { pending: rows };
  }
}

export default CoursesService;