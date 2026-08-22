import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import { suspendUserSchema } from './admin.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const controller = new AdminController();

// Freeze/suspend student or tutor login accounts
router.post('/users/:userId/suspend', authenticate, authorize(UserRole.ADMIN), validate(suspendUserSchema), controller.suspendUser);

// List platform users
router.get('/users', authenticate, authorize(UserRole.ADMIN), controller.listUsers);

export default router;
