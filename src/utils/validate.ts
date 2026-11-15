import { z } from 'zod';
import { AppError } from './app-error';

export function validate<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.output<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new AppError(
      400,
      'Validation failed',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  return result.data;
}