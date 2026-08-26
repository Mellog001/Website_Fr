import { Router } from 'express';
import { TutorsController } from './tutors.controller';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  updateProfileSchema,
  requestCompetencyTestSchema,
  gradeCompetencyTestSchema,
  verifyTutorSchema,
  createSubjectSchema
} from './tutors.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const controller = new TutorsController();

// Public endpoints
router.get('/public', controller.getPublicTutors);
router.get('/public/:profileId', controller.getPublicTutorById);

// Tutor-only profile endpoints
router.get('/profile', authenticate, authorize(UserRole.TUTOR), controller.getProfile);
router.put('/profile', authenticate, authorize(UserRole.TUTOR), validate(updateProfileSchema), controller.updateProfile);

// Subject management for verified tutors
router.post('/subjects', authenticate, authorize(UserRole.TUTOR), validate(createSubjectSchema), controller.createSubject);
router.get('/subjects', authenticate, authorize(UserRole.TUTOR), controller.getSubjects);

// Competency tests endpoints (Tutors request and review, Admins see all)
router.post('/competency-tests', authenticate, authorize(UserRole.TUTOR), validate(requestCompetencyTestSchema), controller.requestCompetencyTest);
router.get('/competency-tests', authenticate, authorize(UserRole.TUTOR, UserRole.ADMIN), controller.listCompetencyTests);

// Admin-only competency grading & verification endpoints
router.post('/competency-tests/:testId/grade', authenticate, authorize(UserRole.ADMIN), validate(gradeCompetencyTestSchema), controller.gradeCompetencyTest);
router.post('/:profileId/verify', authenticate, authorize(UserRole.ADMIN), validate(verifyTutorSchema), controller.verifyTutor);

export default router;