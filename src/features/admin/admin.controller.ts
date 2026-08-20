import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { UserRole } from '../../types/enums';

const adminService = new AdminService();

export class AdminController {
  public suspendUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { isSuspended } = req.body;

      const result = await adminService.suspendUser(req.user!.id, userId, isSuspended);

      res.status(200).json({
        status: 'success',
        message: `User login suspension set to ${isSuspended} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
}

export default AdminController;
