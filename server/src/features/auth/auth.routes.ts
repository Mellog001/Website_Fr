import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../common/middleware/validate';
import { authenticate } from '../../common/middleware/auth.middleware';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
} from './auth.validation';
import { authLimiter } from '../../common/middleware/rate-limiter';

const router = Router();
const controller = new AuthController();

// Public Authentication
router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', validate(refreshSchema), controller.logout);

// Email Verification
router.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
router.post('/resend-verification', authLimiter, validate(resendVerificationSchema), controller.resendVerificationEmail);

// Password Management (Public - Reset Flow)
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), controller.resetPassword);

// Password Management (Protected - Change Password)
router.put('/change-password', authenticate, validate(changePasswordSchema), controller.changePassword);

// Profile Inspection
router.get('/me', authenticate, controller.getMe);

export default router;
