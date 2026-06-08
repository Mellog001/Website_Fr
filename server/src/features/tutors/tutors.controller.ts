import { Request, Response, NextFunction } from 'express';
import { TutorsService } from './tutors.service';

const tutorsService = new TutorsService();

export class TutorsController {
  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await tutorsService.getProfile(req.user!.id);
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await tutorsService.updateProfile(req.user!.id, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public requestCompetencyTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subjectId } = req.body;
      const result = await tutorsService.requestCompetencyTest(req.user!.id, subjectId);

      res.status(201).json({
        status: 'success',
        message: 'Competency test evaluation requested successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public listCompetencyTests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await tutorsService.listCompetencyTests(req.user!.id, req.user!.role);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public gradeCompetencyTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { testId } = req.params;
      const { score, status, feedback } = req.body;
      
      const result = await tutorsService.gradeCompetencyTest(
        req.user!.id,
        testId,
        score,
        status,
        feedback
      );

      res.status(200).json({
        status: 'success',
        message: 'Competency test graded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public verifyTutor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { profileId } = req.params;
      const { isVerified } = req.body;

      const result = await tutorsService.verifyTutor(req.user!.id, profileId, isVerified);

      res.status(200).json({
        status: 'success',
        message: `Tutor verification status set to ${isVerified} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default TutorsController;
