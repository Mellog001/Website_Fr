import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { CoursesService } from '../courses/courses.service';
import { UserRole } from '../../types/enums';

const adminService = new AdminService();
const coursesService = new CoursesService();

export class AdminController {

  /**
   * List all users
   */
  public listUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { role, page, limit } = req.query;

      const result = await adminService.listUsers(
        role as UserRole,
        page ? Number(page) : undefined,
        limit ? Number(limit) : undefined
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List tutors awaiting approval
   */
  public listPendingTutors = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await adminService.listPendingTutors();

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve a tutor
   */
  public verifyTutor = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;

      const result = await adminService.verifyTutor(
        req.user!.id,
        userId
      );

      res.status(200).json({
        status: 'success',
        message: 'Tutor verified successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Suspend / activate a user
   */
  public suspendUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const { isSuspended } = req.body;

      const result = await adminService.suspendUser(
        req.user!.id,
        userId,
        isSuspended
      );

      res.status(200).json({
        status: 'success',
        message: `User login suspension set to ${isSuspended} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ============================================================
  // NEW: Enrollment Management Methods
  // ============================================================

  /**
   * Get pending enrollments (Admin only)
   */
  public getPendingEnrollments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await coursesService.getPendingEnrollments(req.user!.id);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Activate enrollment (Admin only)
   */
  public activateEnrollment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { enrollmentId } = req.params;
      const result = await coursesService.activateEnrollment(req.user!.id, enrollmentId);

      res.status(200).json({
        status: 'success',
        message: 'Enrollment activated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AdminController;