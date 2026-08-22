"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentsController = void 0;
const assessments_service_1 = require("./assessments.service");
const assessmentsService = new assessments_service_1.AssessmentsService();
class AssessmentsController {
    createAssessment = async (req, res, next) => {
        try {
            const result = await assessmentsService.createAssessment(req.user.id, req.user.role, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Assessment created successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    submitAssessment = async (req, res, next) => {
        try {
            const { assessmentId } = req.params;
            const { fileUrl, fileKey } = req.body;
            const result = await assessmentsService.submitAssessment(req.user.id, assessmentId, fileUrl, fileKey);
            res.status(201).json({
                status: 'success',
                message: 'Coursework submitted successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    gradeSubmission = async (req, res, next) => {
        try {
            const { submissionId } = req.params;
            const { score, feedback } = req.body;
            const result = await assessmentsService.gradeSubmission(req.user.id, req.user.role, submissionId, score, feedback);
            res.status(200).json({
                status: 'success',
                message: 'Student submission graded and notified successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    listSubmissions = async (req, res, next) => {
        try {
            const { assessmentId } = req.params;
            const result = await assessmentsService.listSubmissions(req.user.id, req.user.role, assessmentId);
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getAssessmentById = async (req, res, next) => {
        try {
            const { assessmentId } = req.params;
            const result = await assessmentsService.getAssessmentById(req.user.id, assessmentId);
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getMySubmissions = async (req, res, next) => {
        try {
            const result = await assessmentsService.getMySubmissions(req.user.id);
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AssessmentsController = AssessmentsController;
exports.default = AssessmentsController;
//# sourceMappingURL=assessments.controller.js.map