import { Request, Response, NextFunction } from 'express';
import { CoursesService } from './courses.service';

const coursesService = new CoursesService();

export class CoursesController {
  public createSubject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await coursesService.createSubject(req.body);
      
      res.status(201).json({
        status: 'success',
        message: 'Subject configured successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public listSubjects = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await coursesService.listSubjects();
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public createCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await coursesService.createCourse(req.user!.id, req.body);

      res.status(201).json({
        status: 'success',
        message: 'Course created successfully as draft',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { courseId } = req.params;
      const result = await coursesService.updateCourse(req.user!.id, req.user!.role, courseId, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Course updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public createModule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await coursesService.createModule(req.user!.id, req.user!.role, req.body);

      res.status(201).json({
        status: 'success',
        message: 'Course module created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public createMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await coursesService.createMaterial(req.user!.id, req.user!.role, req.body);

      res.status(201).json({
        status: 'success',
        message: 'Module learning material resource created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await coursesService.getCatalog(req.query as any, req.user);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getCourseDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { courseId } = req.params;
      const result = await coursesService.getCourseDetails(
        courseId,
        req.user?.id,
        req.user?.role
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default CoursesController;
