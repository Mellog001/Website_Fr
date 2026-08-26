import { Router } from 'express';
import { CoursesController } from './courses.controller';
import { authenticate, optionalAuthenticate, authorize } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  createSubjectSchema,
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  createMaterialSchema,
  queryCourseCatalogSchema
} from './courses.validation';
import { UserRole } from '../../types/enums';

const router = Router();
const controller = new CoursesController();

// Subject APIs (Admins configure subjects, anyone can view)
router.post('/subjects', authenticate, authorize(UserRole.ADMIN), validate(createSubjectSchema), controller.createSubject);
router.get('/subjects', controller.listSubjects);

// Catalog API (Open to all, optional token parsing for draft/enrolled checks)
router.get('/catalog', optionalAuthenticate, validate(queryCourseCatalogSchema), controller.getCatalog);

// Course Draft & Publishing Configuration APIs (Tutors build)
router.post('/', authenticate, authorize(UserRole.TUTOR), validate(createCourseSchema), controller.createCourse);
router.put('/:courseId', authenticate, authorize(UserRole.TUTOR, UserRole.ADMIN), validate(updateCourseSchema), controller.updateCourse);

// Curriculum Construction APIs (Modules & Resources)
router.post('/modules', authenticate, authorize(UserRole.TUTOR), validate(createModuleSchema), controller.createModule);
router.post('/materials', authenticate, authorize(UserRole.TUTOR), validate(createMaterialSchema), controller.createMaterial);

// Details API (Open outline view, locks full materials inside gated details)
router.get('/:courseId', optionalAuthenticate, controller.getCourseDetails);

// Enrollment endpoints
router.post('/:courseId/enroll', authenticate, authorize(UserRole.STUDENT), controller.enrollInCourse);
router.get('/:courseId/enrollment-status', authenticate, controller.getEnrollmentStatus);


// Admin enrollment management
// router.get('/enrollments/pending', authenticate, authorize(UserRole.ADMIN), controller.getPendingEnrollments);
// router.post('/enrollments/:enrollmentId/activate', authenticate, authorize(UserRole.ADMIN), controller.activateEnrollment);

export default router;
