import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export const isAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isAdmin) {
    throw new ForbiddenError('Bu işlem için admin yetkisi gereklidir');
  }
  next();
}; 