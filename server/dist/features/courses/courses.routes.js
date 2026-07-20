"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const courses_controller_1 = require("./courses.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const courses_validation_1 = require("./courses.validation");
const enums_1 = require("../../types/enums");
const router = (0, express_1.Router)();
const controller = new courses_controller_1.CoursesController();
// Subject APIs (Admins configure subjects, anyone can view)
router.post('/subjects', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.ADMIN), (0, validate_1.validate)(courses_validation_1.createSubjectSchema), controller.createSubject);
router.get('/subjects', controller.listSubjects);
// Catalog API (Open to all, optional token parsing for draft/enrolled checks)
router.get('/catalog', auth_middleware_1.optionalAuthenticate, (0, validate_1.validate)(courses_validation_1.queryCourseCatalogSchema), controller.getCatalog);
// Course Draft & Publishing Configuration APIs (Tutors build)
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.TUTOR), (0, validate_1.validate)(courses_validation_1.createCourseSchema), controller.createCourse);
router.put('/:courseId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.TUTOR, enums_1.UserRole.ADMIN), (0, validate_1.validate)(courses_validation_1.updateCourseSchema), controller.updateCourse);
// Curriculum Construction APIs (Modules & Resources)
router.post('/modules', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.TUTOR), (0, validate_1.validate)(courses_validation_1.createModuleSchema), controller.createModule);
router.post('/materials', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(enums_1.UserRole.TUTOR), (0, validate_1.validate)(courses_validation_1.createMaterialSchema), controller.createMaterial);
// Details API (Open outline view, locks full materials inside gated details)
router.get('/:courseId', auth_middleware_1.optionalAuthenticate, controller.getCourseDetails);
exports.default = router;
//# sourceMappingURL=courses.routes.js.map