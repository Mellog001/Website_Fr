"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tutors_controller_1 = require("./tutors.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const tutors_validation_1 = require("./tutors.validation");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const controller = new tutors_controller_1.TutorsController();
// Tutor-only profile endpoints
router.get('/profile', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.TUTOR), controller.getProfile);
router.put('/profile', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.TUTOR), (0, validate_1.validate)(tutors_validation_1.updateProfileSchema), controller.updateProfile);
// Competency tests endpoints (Tutors request and review, Admins see all)
router.post('/competency-tests', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.TUTOR), (0, validate_1.validate)(tutors_validation_1.requestCompetencyTestSchema), controller.requestCompetencyTest);
router.get('/competency-tests', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.TUTOR, client_1.UserRole.ADMIN), controller.listCompetencyTests);
// Admin-only competency grading & verification endpoints
router.post('/competency-tests/:testId/grade', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.ADMIN), (0, validate_1.validate)(tutors_validation_1.gradeCompetencyTestSchema), controller.gradeCompetencyTest);
router.post('/:profileId/verify', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.ADMIN), (0, validate_1.validate)(tutors_validation_1.verifyTutorSchema), controller.verifyTutor);
exports.default = router;
//# sourceMappingURL=tutors.routes.js.map