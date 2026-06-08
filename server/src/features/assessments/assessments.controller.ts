import { Request, Response, NextFunction } from 'express';
import { AssessmentsService } from './assessments.service';

const assessmentsService = new AssessmentsService();

export class AssessmentsController {
  public createAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await assessmentsService.createAssessment(
        req.user!.id,
        req.user!.role,
        req.body
      );
      
      res.status(201).json({
        status: 'success',
        message: 'Assessment created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public submitAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { assessmentId } = req.params;
      const { fileUrl, fileKey } = req.body;
      const result = await assessmentsService.submitAssessment(
        req.user!.id,
        assessmentId,
        fileUrl,
        fileKey
      );

      res.status(201).json({
        status: 'success',
        message: 'Coursework submitted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public gradeSubmission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { submissionId } = req.params;
      const { score, feedback } = req.body;

      const result = await assessmentsService.gradeSubmission(
        req.user!.id,
        req.user!.role,
        submissionId,
        score,
        feedback
      );

      res.status(200).json({
        status: 'success',
        message: 'Student submission graded and notified successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public listSubmissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { assessmentId } = req.params;
      const result = await assessmentsService.listSubmissions(
        req.user!.id,
        req.user!.role,
        assessmentId
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

export default AssessmentsController;
