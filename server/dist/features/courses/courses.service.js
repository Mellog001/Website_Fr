"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const uuid_1 = require("uuid");
const enums_1 = require("../../types/enums");
const database_1 = __importDefault(require("../../config/database"));
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
class CoursesService {
    /**
     * Create a new subject (Admin only)
     */
    async createSubject(data) {
        const [existing] = await database_1.default.execute('SELECT id FROM subjects WHERE code = ?', [data.code]);
        if (existing.length > 0) {
            throw app_error_1.AppError.conflict(`Subject code [${data.code}] already exists.`);
        }
        const id = (0, uuid_1.v4)();
        await database_1.default.execute('INSERT INTO subjects (id, name, code, description) VALUES (?, ?, ?, ?)', [id, data.name, data.code, data.description || null]);
        const subject = { id, ...data };
        logger_1.logger.info(`📚 Subject created: ${subject.name} [${subject.code}]`);
        return subject;
    }
    /**
     * List all subjects
     */
    async listSubjects() {
        const [rows] = await database_1.default.execute('SELECT * FROM subjects ORDER BY name ASC');
        return rows;
    }
    /**
     * Create a new course (Verified Tutors only)
     */
    async createCourse(userId, data) {
        const [profileRows] = await database_1.default.execute('SELECT id, is_verified FROM tutor_profiles WHERE user_id = ?', [userId]);
        const profile = profileRows[0];
        if (!profile) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        if (!profile.is_verified) {
            throw app_error_1.AppError.forbidden('Access Denied: Your tutor profile must be approved/verified by an Admin before creating courses.');
        }
        // Verify Subject
        const [subjectRows] = await database_1.default.execute('SELECT id, name FROM subjects WHERE id = ?', [data.subjectId]);
        if (subjectRows.length === 0) {
            throw app_error_1.AppError.notFound('Subject not found.');
        }
        const courseId = (0, uuid_1.v4)();
        await database_1.default.execute('INSERT INTO courses (id, title, description, price, subject_id, tutor_id, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)', [courseId, data.title, data.description, data.price, data.subjectId, profile.id, false]);
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
        logger_1.logger.info(`🎓 Course created: "${course.title}" by Tutor: ${profile.id}`);
        return course;
    }
    /**
     * Update Course details (Tutor owner / Admins only)
     */
    async updateCourse(userId, role, courseId, data) {
        const [courseRows] = await database_1.default.execute('SELECT * FROM courses WHERE id = ?', [courseId]);
        const course = courseRows[0];
        if (!course) {
            throw app_error_1.AppError.notFound('Course not found.');
        }
        // Enforce authorization checks
        if (role !== enums_1.UserRole.ADMIN) {
            const [profileRows] = await database_1.default.execute('SELECT id FROM tutor_profiles WHERE user_id = ?', [userId]);
            const profile = profileRows[0];
            if (!profile || course.tutor_id !== profile.id) {
                throw app_error_1.AppError.forbidden('Access Denied: You do not own this course.');
            }
        }
        // Build dynamic UPDATE
        const fields = [];
        const values = [];
        if (data.title !== undefined) {
            fields.push('title = ?');
            values.push(data.title);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }
        if (data.price !== undefined) {
            fields.push('price = ?');
            values.push(data.price);
        }
        if (data.isPublished !== undefined) {
            fields.push('is_published = ?');
            values.push(data.isPublished);
        }
        if (fields.length > 0) {
            values.push(courseId);
            await database_1.default.execute(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, values);
        }
        // Fetch updated course
        const [updatedRows] = await database_1.default.execute('SELECT * FROM courses WHERE id = ?', [courseId]);
        logger_1.logger.info(`🎓 Course updated: "${updatedRows[0]?.title}" [ID: ${courseId}]`);
        return updatedRows[0];
    }
    /**
     * Add a Module to a Course
     */
    async createModule(userId, role, data) {
        // Validate Course Ownership
        await this.verifyCourseOwnership(userId, role, data.courseId);
        const moduleId = (0, uuid_1.v4)();
        await database_1.default.execute('INSERT INTO modules (id, course_id, title, description, `order`) VALUES (?, ?, ?, ?, ?)', [moduleId, data.courseId, data.title, data.description || null, data.order]);
        const module = { id: moduleId, ...data };
        logger_1.logger.info(`📦 Module "${module.title}" added to Course ID: ${data.courseId}`);
        return module;
    }
    /**
     * Add a Material resource to a Module
     */
    async createMaterial(userId, role, data) {
        const [moduleRows] = await database_1.default.execute('SELECT id, course_id FROM modules WHERE id = ?', [data.moduleId]);
        if (moduleRows.length === 0) {
            throw app_error_1.AppError.notFound('Module not found.');
        }
        // Validate ownership of the course enclosing this module
        await this.verifyCourseOwnership(userId, role, moduleRows[0].course_id);
        const materialId = (0, uuid_1.v4)();
        await database_1.default.execute('INSERT INTO materials (id, module_id, title, file_url, file_key, file_type, size) VALUES (?, ?, ?, ?, ?, ?, ?)', [materialId, data.moduleId, data.title, data.fileUrl, data.fileKey, data.fileType, data.size]);
        const material = { id: materialId, ...data };
        logger_1.logger.info(`📎 Material "${material.title}" [Type: ${material.fileType}] uploaded under Module ID: ${data.moduleId}`);
        return material;
    }
    /**
     * Query Course catalog with filters, search, sorting and pagination
     */
    async getCatalog(query, currentUser) {
        const { subjectId, search, sortBy, page, limit } = query;
        const offset = (page - 1) * limit;
        // Build WHERE clauses dynamically
        const conditions = [];
        const params = [];
        // Standard users (students, guests) only see published courses
        if (!currentUser || currentUser.role === enums_1.UserRole.STUDENT) {
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
        if (sortBy === 'price_asc')
            orderBy = 'c.price ASC';
        else if (sortBy === 'price_desc')
            orderBy = 'c.price DESC';
        // Count
        const [countRows] = await database_1.default.execute(`SELECT COUNT(*) as total FROM courses c ${whereClause}`, params);
        const total = countRows[0].total;
        // Fetch courses with subject and tutor info
        const [courses] = await database_1.default.execute(`SELECT c.*, 
              s.name AS subject_name, s.code AS subject_code,
              tp.id AS tutor_profile_id, u.email AS tutor_email
       FROM courses c
       LEFT JOIN subjects s ON s.id = c.subject_id
       LEFT JOIN tutor_profiles tp ON tp.id = c.tutor_id
       LEFT JOIN users u ON u.id = tp.user_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`, [...params, limit, offset]);
        // Map to expected shape
        const mapped = courses.map((c) => ({
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
    async getCourseDetails(courseId, currentUserId, currentUserRole) {
        // Fetch course with subject and tutor
        const [courseRows] = await database_1.default.execute(`SELECT c.*, 
              s.id AS subject_id_ref, s.name AS subject_name, s.code AS subject_code, s.description AS subject_desc,
              tp.id AS tutor_profile_id, tp.user_id AS tutor_user_id, tp.bio AS tutor_bio, tp.is_verified AS tutor_is_verified,
              u.email AS tutor_email
       FROM courses c
       LEFT JOIN subjects s ON s.id = c.subject_id
       LEFT JOIN tutor_profiles tp ON tp.id = c.tutor_id
       LEFT JOIN users u ON u.id = tp.user_id
       WHERE c.id = ?`, [courseId]);
        if (courseRows.length === 0) {
            throw app_error_1.AppError.notFound('Course not found.');
        }
        const courseRow = courseRows[0];
        // Fetch modules
        const [moduleRows] = await database_1.default.execute('SELECT * FROM modules WHERE course_id = ? ORDER BY `order` ASC', [courseId]);
        // Fetch materials for each module
        const modulesWithMaterials = [];
        for (const mod of moduleRows) {
            const [materialRows] = await database_1.default.execute('SELECT id, title, file_type, size FROM materials WHERE module_id = ?', [mod.id]);
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
        if (currentUserId && currentUserRole === enums_1.UserRole.STUDENT) {
            const [enrollmentRows] = await database_1.default.execute('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [currentUserId, courseId]);
            isEnrolled = enrollmentRows.length > 0;
        }
        else if (currentUserRole === enums_1.UserRole.ADMIN) {
            isEnrolled = true;
        }
        else if (currentUserId) {
            // Check if tutor owns course
            const [profileRows] = await database_1.default.execute('SELECT id FROM tutor_profiles WHERE user_id = ?', [currentUserId]);
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
    async verifyCourseOwnership(userId, role, courseId) {
        const [courseRows] = await database_1.default.execute('SELECT id, tutor_id FROM courses WHERE id = ?', [courseId]);
        if (courseRows.length === 0) {
            throw app_error_1.AppError.notFound('Course not found.');
        }
        if (role === enums_1.UserRole.ADMIN)
            return;
        const [profileRows] = await database_1.default.execute('SELECT id FROM tutor_profiles WHERE user_id = ?', [userId]);
        if (profileRows.length === 0 || courseRows[0].tutor_id !== profileRows[0].id) {
            throw app_error_1.AppError.forbidden('Access Denied: You do not own this course.');
        }
    }
}
exports.CoursesService = CoursesService;
exports.default = CoursesService;
//# sourceMappingURL=courses.service.js.map