"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
class CoursesService {
    /**
     * Create a new subject (Admin only)
     */
    async createSubject(data) {
        const existingCode = await prisma_1.prisma.subject.findUnique({ where: { code: data.code } });
        if (existingCode) {
            throw app_error_1.AppError.conflict(`Subject code [${data.code}] already exists.`);
        }
        const subject = await prisma_1.prisma.subject.create({ data });
        logger_1.logger.info(`📚 Subject created: ${subject.name} [${subject.code}]`);
        return subject;
    }
    /**
     * List all subjects
     */
    async listSubjects() {
        return prisma_1.prisma.subject.findMany({
            orderBy: { name: 'asc' },
        });
    }
    /**
     * Create a new course (Verified Tutors only)
     */
    async createCourse(userId, data) {
        const profile = await prisma_1.prisma.tutorProfile.findUnique({ where: { userId } });
        if (!profile) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        if (!profile.isVerified) {
            throw app_error_1.AppError.forbidden('Access Denied: Your tutor profile must be approved/verified by an Admin before creating courses.');
        }
        // Verify Subject
        const subject = await prisma_1.prisma.subject.findUnique({ where: { id: data.subjectId } });
        if (!subject) {
            throw app_error_1.AppError.notFound('Subject not found.');
        }
        const course = await prisma_1.prisma.course.create({
            data: {
                title: data.title,
                description: data.description,
                price: data.price,
                subjectId: data.subjectId,
                tutorId: profile.id,
                isPublished: false, // Draft by default
            },
            include: {
                subject: { select: { name: true } },
            },
        });
        logger_1.logger.info(`🎓 Course created: "${course.title}" by Tutor: ${profile.id}`);
        return course;
    }
    /**
     * Update Course details (Tutor owner / Admins only)
     */
    async updateCourse(userId, role, courseId, data) {
        const course = await prisma_1.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            throw app_error_1.AppError.notFound('Course not found.');
        }
        // Enforce authorization checks
        if (role !== client_1.UserRole.ADMIN) {
            const profile = await prisma_1.prisma.tutorProfile.findUnique({ where: { userId } });
            if (!profile || course.tutorId !== profile.id) {
                throw app_error_1.AppError.forbidden('Access Denied: You do not own this course.');
            }
        }
        const updatedCourse = await prisma_1.prisma.course.update({
            where: { id: courseId },
            data,
        });
        logger_1.logger.info(`🎓 Course updated: "${updatedCourse.title}" [ID: ${courseId}]`);
        return updatedCourse;
    }
    /**
     * Add a Module to a Course
     */
    async createModule(userId, role, data) {
        // Validate Course Ownership
        await this.verifyCourseOwnership(userId, role, data.courseId);
        const module = await prisma_1.prisma.module.create({
            data,
        });
        logger_1.logger.info(`📦 Module "${module.title}" added to Course ID: ${data.courseId}`);
        return module;
    }
    /**
     * Add a Material resource to a Module
     */
    async createMaterial(userId, role, data) {
        const targetModule = await prisma_1.prisma.module.findUnique({
            where: { id: data.moduleId },
        });
        if (!targetModule) {
            throw app_error_1.AppError.notFound('Module not found.');
        }
        // Validate ownership of the course enclosing this module
        await this.verifyCourseOwnership(userId, role, targetModule.courseId);
        const material = await prisma_1.prisma.material.create({
            data,
        });
        logger_1.logger.info(`📎 Material "${material.title}" [Type: ${material.fileType}] uploaded under Module ID: ${data.moduleId}`);
        return material;
    }
    /**
     * Query Course catalog with filters, search, sorting and pagination
     */
    async getCatalog(query, currentUser) {
        const { subjectId, search, sortBy, page, limit } = query;
        const skip = (page - 1) * limit;
        // Filters formulation
        const filterConditions = {};
        // Standard users (students, guests) only see published courses
        if (!currentUser || currentUser.role === client_1.UserRole.STUDENT) {
            filterConditions.isPublished = true;
        }
        if (subjectId) {
            filterConditions.subjectId = subjectId;
        }
        if (search) {
            filterConditions.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Determine sorting
        let orderBy = { createdAt: 'desc' }; // default
        if (sortBy === 'price_asc') {
            orderBy = { price: 'asc' };
        }
        else if (sortBy === 'price_desc') {
            orderBy = { price: 'desc' };
        }
        else if (sortBy === 'newest') {
            orderBy = { createdAt: 'desc' };
        }
        const [total, courses] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.course.count({ where: filterConditions }),
            prisma_1.prisma.course.findMany({
                where: filterConditions,
                include: {
                    subject: { select: { name: true, code: true } },
                    tutor: {
                        select: {
                            id: true,
                            user: { select: { email: true } },
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
        ]);
        return {
            courses,
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
        const course = await prisma_1.prisma.course.findUnique({
            where: { id: courseId },
            include: {
                subject: true,
                tutor: {
                    include: {
                        user: { select: { email: true } },
                    },
                },
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        materials: {
                            select: {
                                id: true,
                                title: true,
                                fileType: true,
                                size: true,
                                // Don't expose file urls in metadata queries unless enrolled
                            },
                        },
                    },
                },
            },
        });
        if (!course) {
            throw app_error_1.AppError.notFound('Course not found.');
        }
        // Determine enrollment status
        let isEnrolled = false;
        if (currentUserId && currentUserRole === client_1.UserRole.STUDENT) {
            const enrollment = await prisma_1.prisma.enrollment.findUnique({
                where: {
                    studentId_courseId: {
                        studentId: currentUserId,
                        courseId,
                    },
                },
            });
            isEnrolled = !!enrollment;
        }
        else if (currentUserRole === client_1.UserRole.ADMIN) {
            isEnrolled = true;
        }
        else if (currentUserId) {
            // Check if tutor owns course
            const profile = await prisma_1.prisma.tutorProfile.findUnique({ where: { userId: currentUserId } });
            if (profile && course.tutorId === profile.id) {
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
exports.CoursesService = CoursesService;
exports.default = CoursesService;
//# sourceMappingURL=courses.service.js.map