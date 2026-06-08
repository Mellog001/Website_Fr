"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMaterialAccess = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
const app_error_1 = require("../errors/app-error");
const checkMaterialAccess = async (req, _res, next) => {
    const { materialId } = req.params;
    if (!materialId) {
        return next(app_error_1.AppError.badRequest('Material ID parameter is missing.'));
    }
    try {
        if (!req.user) {
            return next(app_error_1.AppError.unauthorized('Authentication required to access course resources.'));
        }
        const material = await prisma_1.prisma.material.findUnique({
            where: { id: materialId },
            include: {
                module: {
                    include: {
                        course: {
                            include: {
                                tutor: true,
                            },
                        },
                    },
                },
            },
        });
        if (!material) {
            return next(app_error_1.AppError.notFound('Requested course material does not exist.'));
        }
        const course = material.module.course;
        // 1. Admins pass immediately
        if (req.user.role === client_1.UserRole.ADMIN) {
            return next();
        }
        // 2. Tutors who own the course pass immediately
        if (req.user.role === client_1.UserRole.TUTOR && course.tutor.userId === req.user.id) {
            return next();
        }
        // 3. Students must have a SUCCESSFUL/ACTIVE enrollment
        const enrollment = await prisma_1.prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId: req.user.id,
                    courseId: course.id,
                },
            },
        });
        if (!enrollment) {
            return next(app_error_1.AppError.forbidden(`Access Denied: You must purchase/enroll in the course "${course.title}" to view or download this material.`));
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.checkMaterialAccess = checkMaterialAccess;
exports.default = exports.checkMaterialAccess;
//# sourceMappingURL=material-access.middleware.js.map