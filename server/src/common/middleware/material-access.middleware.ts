import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../types/enums';
import pool from '../../config/database';
import { AppError } from '../errors/app-error';
import { RowDataPacket } from 'mysql2';

export const checkMaterialAccess = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const { materialId } = req.params;

  if (!materialId) {
    return next(AppError.badRequest('Material ID parameter is missing.'));
  }

  try {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required to access course resources.'));
    }

    // Fetch material with module → course → tutor chain via JOINs
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT m.id AS material_id, 
              md.id AS module_id, 
              c.id AS course_id, c.title AS course_title, c.tutor_id,
              tp.user_id AS tutor_user_id
       FROM materials m
       JOIN modules md ON md.id = m.module_id
       JOIN courses c ON c.id = md.course_id
       JOIN tutor_profiles tp ON tp.id = c.tutor_id
       WHERE m.id = ?`,
      [materialId]
    );

    const record = rows[0];

    if (!record) {
      return next(AppError.notFound('Requested course material does not exist.'));
    }

    // 1. Admins pass immediately
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // 2. Tutors who own the course pass immediately
    if (req.user.role === UserRole.TUTOR && record.tutor_user_id === req.user.id) {
      return next();
    }

    // 3. Students must have a SUCCESSFUL/ACTIVE enrollment
    const [enrollmentRows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status IN ('ACTIVE', 'COMPLETED')",
      [req.user.id, record.course_id]
    );

    if (enrollmentRows.length === 0) {
      return next(
        AppError.forbidden(
          `Access Denied: You must purchase/enroll in the course "${record.course_title}" to view or download this material.`
        )
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default checkMaterialAccess;
