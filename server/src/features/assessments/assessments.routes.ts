import { Router } from 'express';
import { AssessmentsController } from './assessments.controller';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  createAssessmentSchema,
  submitAssessmentSchema,
  gradeSubmissionSchema
} from './assessments.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const controller = new AssessmentsController();

// Create new Assessment under a module (Tutors)
router.post('/', authenticate, authorize(UserRole.TUTOR), validate(createAssessmentSchema), controller.createAssessment);

// Submit answers/homework for an assessment (Students)
router.post('/:assessmentId/submissions', authenticate, authorize(UserRole.STUDENT), validate(submitAssessmentSchema), controller.submitAssessment);

// Grade a student's submission (Tutors)
router.post('/submissions/:submissionId/grade', authenticate, authorize(UserRole.TUTOR), validate(gradeSubmissionSchema), controller.gradeSubmission);

// List all student submissions for a specific assessment (Tutors/Admins)
router.get('/:assessmentId/submissions', authenticate, authorize(UserRole.TUTOR, UserRole.ADMIN), controller.listSubmissions);

export default router;
