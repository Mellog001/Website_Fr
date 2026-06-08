import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  public getAdminStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await analyticsService.getAdminDashboardStats();
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getTutorStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await analyticsService.getTutorDashboardStats(req.user!.id);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AnalyticsController;
