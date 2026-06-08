import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../common/middleware/validate';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';
import { authLimiter } from '../../common/middleware/rate-limiter';

const router = Router();
const controller = new AuthController();

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', validate(refreshSchema), controller.logout);

export default router;
