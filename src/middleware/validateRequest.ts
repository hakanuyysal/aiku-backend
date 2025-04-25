import { z } from 'zod';
import { BadRequestError } from '../utils/errors';

export const validateRequest = async <T>(data: any, schema: z.Schema<T>): Promise<T> => {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors.map(e => e.message).join(', '));
    }
    throw error;
  }
}; 