"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesController = void 0;
const courses_service_1 = require("./courses.service");
const coursesService = new courses_service_1.CoursesService();
class CoursesController {
    createSubject = async (req, res, next) => {
        try {
            const result = await coursesService.createSubject(req.body);
            res.status(201).json({
                status: 'success',
                message: 'Subject configured successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    listSubjects = async (_req, res, next) => {
        try {
            const result = await coursesService.listSubjects();
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    createCourse = async (req, res, next) => {
        try {
            const result = await coursesService.createCourse(req.user.id, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Course created successfully as draft',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updateCourse = async (req, res, next) => {
        try {
            const { courseId } = req.params;
            const result = await coursesService.updateCourse(req.user.id, req.user.role, courseId, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Course updated successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    createModule = async (req, res, next) => {
        try {
            const result = await coursesService.createModule(req.user.id, req.user.role, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Course module created successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    createMaterial = async (req, res, next) => {
        try {
            const result = await coursesService.createMaterial(req.user.id, req.user.role, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Module learning material resource created successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getCatalog = async (req, res, next) => {
        try {
            const result = await coursesService.getCatalog(req.query, req.user);
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getCourseDetails = async (req, res, next) => {
        try {
            const { courseId } = req.params;
            const result = await coursesService.getCourseDetails(courseId, req.user?.id, req.user?.role);
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
exports.CoursesController = CoursesController;
exports.default = CoursesController;
//# sourceMappingURL=courses.controller.js.map