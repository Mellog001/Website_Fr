import { v4 as uuidv4 } from 'uuid';
import { UserRole, SubmissionStatus } from '../../types/enums';
import pool from '../../config/database';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../config/logger';
import { emailService } from '../../common/services/email.service';
import { RowDataPacket } from 'mysql2';

export class AssessmentsService {
  /**
   * Create an Assessment under a Course Module (Tutor Owner / Admin only)
   */
  public async createAssessment(
    userId: string,
    role: UserRole,
    data: { moduleId: string; title: string; description: string; maxScore: number; fileUrl?: string; fileKey?: string }
  ) {
    const [moduleRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, course_id FROM modules WHERE id = ?',
      [data.moduleId]
    );

    if (moduleRows.length === 0) {
      throw AppError.notFound('Target course module not found.');
    }

    // Verify course tutor ownership
    await this.verifyCourseOwnership(userId, role, moduleRows[0].course_id);

    const assessmentId = uuidv4();
    await pool.execute(
      'INSERT INTO assessments (id, module_id, title, description, max_score, file_url, file_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [assessmentId, data.moduleId, data.title, data.description, data.maxScore, data.fileUrl || null, data.fileKey || null]
    );

    const assessment = { id: assessmentId, ...data };
    logger.info(`📝 Assessment "${assessment.title}" created under Module ID: ${data.moduleId}`);
    return assessment;
  }

  /**
   * Submit homework/answers for an Assessment (Enrolled Students only)
   */
  public async submitAssessment(
    studentId: string,
    assessmentId: string,
    fileUrl: string,
    fileKey: string
  ) {
    const [assessmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT a.*, m.course_id
       FROM assessments a
       JOIN modules m ON m.id = a.module_id
       WHERE a.id = ?`,
      [assessmentId]
    );

    if (assessmentRows.length === 0) {
      throw AppError.notFound('Assessment not found.');
    }

    const assessment = assessmentRows[0];
    const courseId = assessment.course_id;

    // Verify Student Enrollment
    const [enrollmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, courseId]
    );

    if (enrollmentRows.length === 0) {
      throw AppError.forbidden('Access Denied: You must purchase/enroll in the course before submitting coursework.');
    }

    // Check for existing submissions
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM submissions WHERE assessment_id = ? AND student_id = ?',
      [assessmentId, studentId]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      if (existing.status === SubmissionStatus.GRADED) {
        throw AppError.badRequest('This assessment has already been graded. Submissions are locked.');
      }

      // Overwrite/Update existing draft submission
      await pool.execute(
        'UPDATE submissions SET file_url = ?, file_key = ?, created_at = NOW() WHERE id = ?',
        [fileUrl, fileKey, existing.id]
      );

      const [updated] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM submissions WHERE id = ?',
        [existing.id]
      );

      logger.info(`📝 Student ${studentId} resubmitted coursework for Assessment ID: ${assessmentId}`);
      return updated[0];
    }

    // Create a new submission
    const submissionId = uuidv4();
    await pool.execute(
      'INSERT INTO submissions (id, assessment_id, student_id, file_url, file_key, status) VALUES (?, ?, ?, ?, ?, ?)',
      [submissionId, assessmentId, studentId, fileUrl, fileKey, SubmissionStatus.SUBMITTED]
    );

    const [created] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM submissions WHERE id = ?',
      [submissionId]
    );

    logger.info(`📝 Student ${studentId} submitted coursework for Assessment ID: ${assessmentId}`);
    return created[0];
  }

  /**
   * Grade a student submission (Tutor Owner / Admin only)
   */
  public async gradeSubmission(
    tutorUserId: string,
    role: UserRole,
    submissionId: string,
    score: number,
    feedback: string
  ) {
    const [subRows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, a.max_score, a.title AS assessment_title, m.course_id,
              u.email AS student_email
       FROM submissions s
       JOIN assessments a ON a.id = s.assessment_id
       JOIN modules m ON m.id = a.module_id
       JOIN users u ON u.id = s.student_id
       WHERE s.id = ?`,
      [submissionId]
    );

    if (subRows.length === 0) {
      throw AppError.notFound('Student submission not found.');
    }

    const submission = subRows[0];

    if (score > submission.max_score) {
      throw AppError.badRequest(`Grade score (${score}) exceeds the maximum evaluation limit of ${submission.max_score}.`);
    }

    // Verify Course ownership
    const courseId = submission.course_id;
    await this.verifyCourseOwnership(tutorUserId, role, courseId);

    // Update submission
    await pool.execute(
      'UPDATE submissions SET score = ?, feedback = ?, status = ?, graded_by_id = ? WHERE id = ?',
      [score, feedback, SubmissionStatus.GRADED, tutorUserId, submissionId]
    );

    // Fetch course details for title reference
    const [courseRows] = await pool.execute<RowDataPacket[]>(
      'SELECT title FROM courses WHERE id = ?',
      [courseId]
    );

    // Trigger asynchronous grade notifications alert
    emailService.sendGradeNotification(
      submission.student_email,
      courseRows[0]?.title || 'EduConnect Course',
      submission.assessment_title,
      score,
      submission.max_score,
      feedback
    ).catch(err => {
      logger.error(`Failed to send grade notification email to ${submission.student_email}:`, err);
    });

    const [gradedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM submissions WHERE id = ?',
      [submissionId]
    );

    logger.info(`🎓 Submission ID: ${submissionId} graded with ${score} marks by Tutor: ${tutorUserId}`);
    return gradedRows[0];
  }

  /**
   * Retrieve all submissions for an assessment (Tutors/Admins only)
   */
  public async listSubmissions(userId: string, role: UserRole, assessmentId: string) {
    const [assessmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT a.id, m.course_id
       FROM assessments a
       JOIN modules m ON m.id = a.module_id
       WHERE a.id = ?`,
      [assessmentId]
    );

    if (assessmentRows.length === 0) {
      throw AppError.notFound('Assessment not found.');
    }

    // Ensure access permissions
    await this.verifyCourseOwnership(userId, role, assessmentRows[0].course_id);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, u.id AS student_user_id, u.email AS student_email
       FROM submissions s
       JOIN users u ON u.id = s.student_id
       WHERE s.assessment_id = ?
       ORDER BY s.created_at DESC`,
      [assessmentId]
    );

    return rows.map((r: any) => ({
      ...r,
      student: { id: r.student_user_id, email: r.student_email },
    }));
  }

  /**
   * View a single assessment details (Students)
   */
  public async getAssessmentById(studentId: string, assessmentId: string) {
    const [assessmentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT a.*, m.course_id 
       FROM assessments a
       JOIN modules m ON m.id = a.module_id
       WHERE a.id = ?`,
      [assessmentId]
    );

    if (assessmentRows.length === 0) {
      throw AppError.notFound('Assessment not found.');
    }

    const assessment = assessmentRows[0];
    
    // Verify Student Enrollment
    const [enrollmentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, assessment.course_id]
    );

    if (enrollmentRows.length === 0) {
      throw AppError.forbidden('Access Denied: You must be enrolled in this course to view its assessments.');
    }

    return assessment;
  }

  /**
   * Track all submitted and graded assignments for a student
   */
  public async getMySubmissions(studentId: string) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, a.title AS assessment_title, a.max_score,
              c.title AS course_title, c.id AS course_id
       FROM submissions s
       JOIN assessments a ON a.id = s.assessment_id
       JOIN modules m ON m.id = a.module_id
       JOIN courses c ON c.id = m.course_id
       WHERE s.student_id = ?
       ORDER BY s.created_at DESC`,
      [studentId]
    );

    return rows.map((r: any) => ({
      id: r.id,
      assessmentId: r.assessment_id,
      fileUrl: r.file_url,
      fileKey: r.file_key,
      score: r.score,
      feedback: r.feedback,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      assessment: {
        title: r.assessment_title,
        maxScore: r.max_score,
      },
      course: {
        id: r.course_id,
        title: r.course_title,
      }
    }));
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
}

export default AssessmentsService;
