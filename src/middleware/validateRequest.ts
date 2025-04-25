import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BadRequestError } from '../utils/errors';

export const validateRequest = (schema: z.Schema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = await schema.parseAsync(req.body);
      req.body = data;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError(error.errors.map(e => e.message).join(', '));
      }
      throw error;
    }
  };
}; 