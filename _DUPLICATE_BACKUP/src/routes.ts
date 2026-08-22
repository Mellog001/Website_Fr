import { Router } from 'express';
import authRoutes from './features/auth/auth.routes';
import tutorRoutes from './features/tutors/tutors.routes';
import courseRoutes from './features/courses/courses.routes';
import storageRoutes from './features/storage/storage.routes';
import assessmentRoutes from './features/assessments/assessments.routes';
import paymentRoutes from './features/payments/payments.routes';
import adminRoutes from './features/admin/admin.routes';
import analyticsRoutes from './features/analytics/analytics.routes';

const rootRouter = Router();

rootRouter.use('/auth', authRoutes);
rootRouter.use('/tutors', tutorRoutes);
rootRouter.use('/courses', courseRoutes);
rootRouter.use('/storage', storageRoutes);
rootRouter.use('/assessments', assessmentRoutes);
rootRouter.use('/payments', paymentRoutes);
rootRouter.use('/admin', adminRoutes);
rootRouter.use('/analytics', analyticsRoutes);

export default rootRouter;
