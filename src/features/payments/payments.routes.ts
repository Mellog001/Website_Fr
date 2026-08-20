import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import { initiateStkPushSchema } from './payments.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const controller = new PaymentsController();

// Trigger an STK Push to complete purchase (Student only)
router.post('/stk-push', authenticate, authorize(UserRole.STUDENT), validate(initiateStkPushSchema), controller.initiateStkPush);

// Safaricom Webhook callback parser (Publicly exposed but token-secured)
router.post('/mpesa-callback', controller.mpesaCallback);

export default router;
