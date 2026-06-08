"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorsController = void 0;
const tutors_service_1 = require("./tutors.service");
const tutorsService = new tutors_service_1.TutorsService();
class TutorsController {
    getProfile = async (req, res, next) => {
        try {
            const result = await tutorsService.getProfile(req.user.id);
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updateProfile = async (req, res, next) => {
        try {
            const result = await tutorsService.updateProfile(req.user.id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    requestCompetencyTest = async (req, res, next) => {
        try {
            const { subjectId } = req.body;
            const result = await tutorsService.requestCompetencyTest(req.user.id, subjectId);
            res.status(201).json({
                status: 'success',
                message: 'Competency test evaluation requested successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    listCompetencyTests = async (req, res, next) => {
        try {
            const result = await tutorsService.listCompetencyTests(req.user.id, req.user.role);
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    gradeCompetencyTest = async (req, res, next) => {
        try {
            const { testId } = req.params;
            const { score, status, feedback } = req.body;
            const result = await tutorsService.gradeCompetencyTest(req.user.id, testId, score, status, feedback);
            res.status(200).json({
                status: 'success',
                message: 'Competency test graded successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    verifyTutor = async (req, res, next) => {
        try {
            const { profileId } = req.params;
            const { isVerified } = req.body;
            const result = await tutorsService.verifyTutor(req.user.id, profileId, isVerified);
            res.status(200).json({
                status: 'success',
                message: `Tutor verification status set to ${isVerified} successfully`,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.TutorsController = TutorsController;
exports.default = TutorsController;
//# sourceMappingURL=tutors.controller.js.map