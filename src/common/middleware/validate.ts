import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../errors/app-error';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Assign parsed values back to requests to maintain clean type casting
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => ({
          field: err.path.slice(1).join('.'), // Remove top-level 'body'/'query'/'params'
          message: err.message,
        }));
        
        next(new AppError('Request validation failed', 400, issues));
      } else {
        next(error);
      }
    }
  };
};

export default validate;
