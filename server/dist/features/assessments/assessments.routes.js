"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assessments_controller_1 = require("./assessments.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const assessments_validation_1 = require("./assessments.validation");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const controller = new assessments_controller_1.AssessmentsController();
// Create new Assessment under a module (Tutors)
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.TUTOR), (0, validate_1.validate)(assessments_validation_1.createAssessmentSchema), controller.createAssessment);
// Submit answers/homework for an assessment (Students)
router.post('/:assessmentId/submissions', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.STUDENT), (0, validate_1.validate)(assessments_validation_1.submitAssessmentSchema), controller.submitAssessment);
// Grade a student's submission (Tutors)
router.post('/submissions/:submissionId/grade', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.TUTOR), (0, validate_1.validate)(assessments_validation_1.gradeSubmissionSchema), controller.gradeSubmission);
// List all student submissions for a specific assessment (Tutors/Admins)
router.get('/:assessmentId/submissions', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.TUTOR, client_1.UserRole.ADMIN), controller.listSubmissions);
exports.default = router;
//# sourceMappingURL=assessments.routes.js.map