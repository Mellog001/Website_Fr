import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../../types/enums';
import pool from '../../config/database';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../config/logger';
import { RowDataPacket } from 'mysql2';

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
  public async createCourse(userId: string, data: { title: string; description: string; price: number; subjectId: string }) {
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
      'INSERT INTO courses (id, title, description, price, subject_id, tutor_id, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [courseId, data.title, data.description, data.price, data.subjectId, profile.id, false]
    );

    const course = {
      id: courseId,
      title: data.title,
      description: data.description,
      price: data.price,
      subjectId: data.subjectId,
      tutorId: profile.id,
      isPublished: false,
      subject: { name: subjectRows[0].name },
    };

    logger.info(`🎓 Course created: "${course.title}" by Tutor: ${profile.id}`);
    return course;
  }

  /**
   * Update Course details (Tutor owner / Admins only)
   */
  public async updateCourse(
    userId: string,
    role: UserRole,
    courseId: string,
    data: { title?: string; description?: string; price?: number; isPublished?: boolean }
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

    if (fields.length > 0) {
      values.push(courseId);
      await pool.execute(
        `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Fetch updated course
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM courses WHERE id = ?',
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
    const safeLimit = Number.isInteger(Number(limit)) ? Number(limit) : 10;
    const safeOffset = Number.isInteger(Number(offset)) ? Number(offset) : 0;

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
        'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
        [currentUserId, courseId]
      );
      isEnrolled = enrollmentRows.length > 0;
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
}

export default CoursesService;