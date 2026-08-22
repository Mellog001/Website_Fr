import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../types/enums';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../errors/app-error';
import pool from '../../config/database';
import { RowDataPacket } from 'mysql2';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication failed: Missing or invalid token format.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, role FROM users WHERE id = ? AND deleted_at IS NULL',
      [decoded.userId]
    );

    const user = rows[0];

    if (!user) {
      return next(AppError.unauthorized('Authentication failed: User account not found or deactivated.'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Let guests pass
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, role FROM users WHERE id = ? AND deleted_at IS NULL',
      [decoded.userId]
    );

    const user = rows[0];

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
      };
    }
    
    next();
  } catch (error) {
    // If token is invalid/expired, fail-fast rather than letting them browse under bad signature
    next(error);
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required to perform this action.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden(`Access Denied: Required roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`));
    }

    next();
  };
};
