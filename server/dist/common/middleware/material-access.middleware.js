"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMaterialAccess = void 0;
const enums_1 = require("../../types/enums");
const database_1 = __importDefault(require("../../config/database"));
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
        // Fetch material with module → course → tutor chain via JOINs
        const [rows] = await database_1.default.execute(`SELECT m.id AS material_id, 
              mod.id AS module_id, 
              c.id AS course_id, c.title AS course_title, c.tutor_id,
              tp.user_id AS tutor_user_id
       FROM materials m
       JOIN modules mod ON mod.id = m.module_id
       JOIN courses c ON c.id = mod.course_id
       JOIN tutor_profiles tp ON tp.id = c.tutor_id
       WHERE m.id = ?`, [materialId]);
        const record = rows[0];
        if (!record) {
            return next(app_error_1.AppError.notFound('Requested course material does not exist.'));
        }
        // 1. Admins pass immediately
        if (req.user.role === enums_1.UserRole.ADMIN) {
            return next();
        }
        // 2. Tutors who own the course pass immediately
        if (req.user.role === enums_1.UserRole.TUTOR && record.tutor_user_id === req.user.id) {
            return next();
        }
        // 3. Students must have a SUCCESSFUL/ACTIVE enrollment
        const [enrollmentRows] = await database_1.default.execute('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [req.user.id, record.course_id]);
        if (enrollmentRows.length === 0) {
            return next(app_error_1.AppError.forbidden(`Access Denied: You must purchase/enroll in the course "${record.course_title}" to view or download this material.`));
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