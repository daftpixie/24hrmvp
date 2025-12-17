"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.Errors = exports.AppError = void 0;
const zod_1 = require("zod");
// Optional imports - these are added with beta hardening
let logger;
let captureException;
try {
    const loggerModule = require('../lib/logger');
    logger = loggerModule.logger;
}
catch {
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
}
catch {
    // Fallback to no-op if Sentry not yet installed
    captureException = () => undefined;
}
/**
 * Custom application error class
 * Use for expected errors with specific status codes
 */
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // Operational errors are expected/handled
        this.details = details;
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Common error factory functions
 */
exports.Errors = {
    badRequest: (message, details) => new AppError(message, 400, 'BAD_REQUEST', details),
    unauthorized: (message = 'Authentication required') => new AppError(message, 401, 'UNAUTHORIZED'),
    forbidden: (message = 'Access denied') => new AppError(message, 403, 'FORBIDDEN'),
    notFound: (resource = 'Resource') => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
    conflict: (message) => new AppError(message, 409, 'CONFLICT'),
    tooManyRequests: (message = 'Too many requests, please slow down') => new AppError(message, 429, 'TOO_MANY_REQUESTS'),
    internal: (message = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR'),
    serviceUnavailable: (message = 'Service temporarily unavailable') => new AppError(message, 503, 'SERVICE_UNAVAILABLE'),
};
/**
 * Format error for response
 */
function formatError(error, requestId, includeStack = false) {
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
function handleZodError(error, requestId) {
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
function handlePrismaError(error, requestId) {
    // Prisma error codes
    const errorMap = {
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
const errorHandler = (err, req, res, _next) => {
    const requestId = req.id || req.requestId || 'unknown';
    const isProduction = process.env.NODE_ENV === 'production';
    // Determine status code
    let statusCode = 500;
    if (err instanceof AppError) {
        statusCode = err.statusCode;
    }
    else if (err instanceof zod_1.ZodError) {
        statusCode = 400;
    }
    else if (err.code?.startsWith?.('P')) {
        // Prisma error - determine status from error code
        const prismaStatusMap = {
            P2002: 409,
            P2025: 404,
            P2003: 400,
            P2014: 400,
            P2024: 503,
        };
        statusCode = prismaStatusMap[err.code] || 500;
    }
    // Log error (with different levels based on severity)
    if (statusCode >= 500) {
        logger.error({
            err,
            requestId,
            method: req.method,
            url: req.url,
            userId: req.user?.fid,
        }, 'Server error');
        // Report to Sentry (only 5xx errors)
        captureException(err, {
            requestId,
            method: req.method,
            url: req.url,
            userId: req.user?.fid,
        });
    }
    else if (statusCode >= 400) {
        logger.warn({
            err: err.message,
            code: err.code,
            requestId,
            method: req.method,
            url: req.url,
        }, 'Client error');
    }
    // Format response based on error type
    let response;
    if (err instanceof zod_1.ZodError) {
        response = handleZodError(err, requestId);
    }
    else if (err.code?.startsWith?.('P')) {
        response = handlePrismaError(err, requestId);
    }
    else {
        response = formatError(err, requestId, !isProduction);
    }
    // Don't expose internal error details in production
    if (isProduction && statusCode === 500 && !(err instanceof AppError)) {
        response.error.message = 'An unexpected error occurred';
        delete response.error.stack;
    }
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, _res, next) => {
    next(exports.Errors.notFound(`Route ${req.method} ${req.path}`));
};
exports.notFoundHandler = notFoundHandler;
/**
 * Async wrapper for route handlers (optional - Express 5 handles this)
 * Use if you need explicit control over error handling
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
exports.default = {
    errorHandler: exports.errorHandler,
    notFoundHandler: exports.notFoundHandler,
    asyncHandler: exports.asyncHandler,
    AppError,
    Errors: exports.Errors,
};
//# sourceMappingURL=errorHandler.js.map