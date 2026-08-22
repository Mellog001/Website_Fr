import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { UserRole } from '../../types/enums';

const router = Router();
const controller = new AnalyticsController();

// Admin-level dashboard metrics (system-wide summaries)
router.get('/admin', authenticate, authorize(UserRole.ADMIN), controller.getAdminStats);

// Tutor-level earnings and students enrollments statistics
router.get('/tutor', authenticate, authorize(UserRole.TUTOR), controller.getTutorStats);

export default router;
