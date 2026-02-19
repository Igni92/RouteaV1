/**
 * Global Error Handler Middleware — GERVIFRAIS
 * AGENT-BACKEND-API
 *
 * Catches all unhandled errors in Express routes and formats them
 * into the standard ApiError response shape.
 */

import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly code?: string,
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`, 'RESOURCE_NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(details: string[]) {
    super(400, 'Validation failed', 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'DUPLICATE_RESOURCE');
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(422, message, 'BUSINESS_RULE_VIOLATION');
  }
}

/**
 * Express error handler — must have 4 parameters to be recognized as error handler.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log every error (in production, use structured logging)
  console.error(`[ERROR] ${req.method} ${req.path}`, {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'AUTH_INVALID',
    });
    return;
  }

  // Multer file size error
  if (err.name === 'MulterError' && (err as Error & { code?: string }).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: 'File too large (max 10MB)',
      code: 'FILE_TOO_LARGE',
    });
    return;
  }

  // Generic internal server error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    code: 'INTERNAL_ERROR',
  });
}

/**
 * 404 handler — must be registered AFTER all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'ROUTE_NOT_FOUND',
  });
}
