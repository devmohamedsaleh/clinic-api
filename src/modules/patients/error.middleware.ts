import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../utils/app-error';
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    err.type === 'entity.parse.failed'
  ) {
    res.status(400).json({ message: 'Invalid JSON body' });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}