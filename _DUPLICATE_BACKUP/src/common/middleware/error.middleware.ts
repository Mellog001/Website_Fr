import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any[] = [];

  // Handle known operational exceptions
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }

  // Handle MySQL database constraint exceptions
  else if ((err as any).code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Conflict: A record with that key already exists.';
  } else if ((err as any).code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Bad Request: Relational foreign key constraint failed.';
  } else if ((err as any).code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 400;
    message = 'Bad Request: Cannot delete record because it is referenced by other records.';
  } else if ((err as any).code?.startsWith?.('ER_')) {
    logger.error('MySQL DB error captured:', err);
    statusCode = 400;
    message = 'Database operation failed.';
  }

  // Handle JWT parsing exceptions
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication Error: Access token has expired.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication Error: Invalid access token signature.';
  }

  // Log server/internal issues with stack trace
  if (statusCode === 500) {
    logger.error(`[CRITICAL] Server Error: ${err.message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn(`Operational Warning [${statusCode}] ${req.method} ${req.originalUrl}: ${err.message}`);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(details.length > 0 ? { details } : {}),
    ...(env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
  });
};

export default errorMiddleware;
