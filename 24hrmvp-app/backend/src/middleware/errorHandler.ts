/**
 * Error Handling Middleware
 * 
 * Centralized error handling for Express 5.x
 * Features:
 * - Structured error responses
 * - Sentry integration
 * - Production vs development error detail
 * - Request ID correlation
 * - Zod and Prisma error formatting
 * 
 * Express 5 automatically catches async errors, so no wrapper needed!
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

// Optional imports - these are added with beta hardening
let logger: any;
let captureException: any;

try {
  const loggerModule = require('../lib/logger');
  logger = loggerModule.logger;
} catch {
  // Fallback to console if logger not yet installed
  logger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
  };
}

try {
  const sentryModule = require('../lib/sentry');
  captureException = sentryModule.captureException;
} catch {
  // Fallback to no-op if Sentry not yet installed
  captureException = () => undefined;
}

/**
 * Custom application error class
 * Use for expected errors with specific status codes
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Operational errors are expected/handled
    this.details = details;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error factory functions
 */
export const Errors = {
  badRequest: (message: string, details?: unknown) => 
    new AppError(message, 400, 'BAD_REQUEST', details),
  
  unauthorized: (message = 'Authentication required') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  forbidden: (message = 'Access denied') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  notFound: (resource = 'Resource') => 
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  
  conflict: (message: string) => 
    new AppError(message, 409, 'CONFLICT'),
  
  tooManyRequests: (message = 'Too many requests, please slow down') => 
    new AppError(message, 429, 'TOO_MANY_REQUESTS'),
  
  internal: (message = 'Internal server error') => 
    new AppError(message, 500, 'INTERNAL_ERROR'),
  
  serviceUnavailable: (message = 'Service temporarily unavailable') => 
    new AppError(message, 503, 'SERVICE_UNAVAILABLE'),
};

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    stack?: string;
  };
}

/**
 * Format error for response
 */
function formatError(
  error: Error | AppError,
  requestId?: string,
  includeStack = false
): ErrorResponse {
  const isAppError = error instanceof AppError;
  
  return {
    success: false,
    error: {
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      message: error.message,
      details: isAppError ? error.details : undefined,
      requestId,
      stack: includeStack ? error.stack : undefined,
    },
  };
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError, requestId?: string): ErrorResponse {
  const details = error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
  
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details,
      requestId,
    },
  };
}

/**
 * Handle Prisma errors
 */
function handlePrismaError(error: any, requestId?: string): ErrorResponse {
  // Prisma error codes
  const errorMap: Record<string, { status: number; message: string; code: string }> = {
    P2002: { status: 409, message: 'A record with this value already exists', code: 'DUPLICATE_RECORD' },
    P2025: { status: 404, message: 'Record not found', code: 'NOT_FOUND' },
    P2003: { status: 400, message: 'Foreign key constraint failed', code: 'FOREIGN_KEY_ERROR' },
    P2014: { status: 400, message: 'Required relation violation', code: 'RELATION_ERROR' },
    P2024: { status: 503, message: 'Database connection timeout', code: 'DB_TIMEOUT' },
  };
  
  const mapped = errorMap[error.code];
  
  if (mapped) {
    return {
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        requestId,
      },
    };
  }
  
  // Unknown Prisma error - treat as internal
  return {
    success: false,
    error: {
      code: 'DATABASE_ERROR',
      message: 'A database error occurred',
      requestId,
    },
  };
}

/**
 * Main error handler middleware
 * Must be registered LAST in middleware chain
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = (req as any).id || (req as any).requestId || 'unknown';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Determine status code
  let statusCode = 500;
  if (err instanceof AppError) {
    statusCode = err.statusCode;
  } else if (err instanceof ZodError) {
    statusCode = 400;
  } else if ((err as any).code?.startsWith?.('P')) {
    // Prisma error - determine status from error code
    const prismaStatusMap: Record<string, number> = {
      P2002: 409,
      P2025: 404,
      P2003: 400,
      P2014: 400,
      P2024: 503,
    };
    statusCode = prismaStatusMap[(err as any).code] || 500;
  }
  
  // Log error (with different levels based on severity)
  if (statusCode >= 500) {
    logger.error({
      err,
      requestId,
      method: req.method,
      url: req.url,
      userId: (req as any).user?.fid,
    }, 'Server error');
    
    // Report to Sentry (only 5xx errors)
    captureException(err, {
      requestId,
      method: req.method,
      url: req.url,
      userId: (req as any).user?.fid,
    });
  } else if (statusCode >= 400) {
    logger.warn({
      err: err.message,
      code: (err as any).code,
      requestId,
      method: req.method,
      url: req.url,
    }, 'Client error');
  }
  
  // Format response based on error type
  let response: ErrorResponse;
  
  if (err instanceof ZodError) {
    response = handleZodError(err, requestId);
  } else if ((err as any).code?.startsWith?.('P')) {
    response = handlePrismaError(err, requestId);
  } else {
    response = formatError(err, requestId, !isProduction);
  }
  
  // Don't expose internal error details in production
  if (isProduction && statusCode === 500 && !(err instanceof AppError)) {
    response.error.message = 'An unexpected error occurred';
    delete response.error.stack;
  }
  
  res.status(statusCode).json(response);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(Errors.notFound(`Route ${req.method} ${req.path}`));
};

/**
 * Async wrapper for route handlers (optional - Express 5 handles this)
 * Use if you need explicit control over error handling
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  Errors,
};
