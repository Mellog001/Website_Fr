import { Request, Response, NextFunction } from 'express';
import { MpesaService } from './mpesa.service';
import { mpesaConfig } from '../../config/mpesa';
import { AppError } from '../../common/errors/app-error';

const mpesaService = new MpesaService();

export class PaymentsController {
  /**
   * Request STK Push payment trigger for a course
   */
  public initiateStkPush = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { courseId, phoneNumber } = req.body;
      const result = await mpesaService.initiateStkPush(
        req.user!.id,
        courseId,
        phoneNumber
      );

      res.status(200).json({
        status: 'success',
        message: 'Payment dispatch trigger initiated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Safaricom Daraja callback webhook processor
   */
  public mpesaCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { token } = req.query;

    try {
      // Security Check: Verify secret PassKey token in callback URL handshake
      if (!token || token !== mpesaConfig.passKey) {
        throw AppError.forbidden('Unauthorized webhook execution request.');
      }

      const result = await mpesaService.processCallback(req.body);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default PaymentsController;
