import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

// ─── Global Error Handler ─────────────────────────────────────────────────────

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? 'Internal server error';

  logger.error('[API] Error', {
    method: req.method,
    path: req.path,
    statusCode,
    error: message,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code ?? 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}

export function createError(message: string, statusCode = 400, code?: string): ApiError {
  const err = new Error(message) as ApiError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
