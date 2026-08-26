import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import { suspendUserSchema } from './admin.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const controller = new AdminController();

/**
 * List all platform users
 */
router.get(
  '/users',
  authenticate,
  authorize(UserRole.ADMIN),
  controller.listUsers
);

/**
 * List tutors waiting for approval
 */
router.get(
  '/tutors/pending',
  authenticate,
  authorize(UserRole.ADMIN),
  controller.listPendingTutors
);

/**
 * Approve / verify tutor
 */
router.post(
  '/tutors/:userId/verify',
  authenticate,
  authorize(UserRole.ADMIN),
  controller.verifyTutor
);

/**
 * Suspend / activate user
 */
router.post(
  '/users/:userId/suspend',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(suspendUserSchema),
  controller.suspendUser
);

// ============================================================
// NEW: Enrollment Management Routes
// ============================================================

/**
 * Get all pending enrollments
 */
router.get(
  '/enrollments/pending',
  authenticate,
  authorize(UserRole.ADMIN),
  controller.getPendingEnrollments
);

/**
 * Activate an enrollment (approve student access)
 */
router.post(
  '/enrollments/:enrollmentId/activate',
  authenticate,
  authorize(UserRole.ADMIN),
  controller.activateEnrollment
);

export default router;