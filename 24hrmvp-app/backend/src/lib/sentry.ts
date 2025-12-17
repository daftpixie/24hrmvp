/**
 * Sentry Error Tracking Integration
 * 
 * Production error monitoring with:
 * - Automatic error capturing
 * - User context tracking
 * - Request breadcrumbs
 * - Performance monitoring (optional)
 * 
 * IMPORTANT: Must be initialized BEFORE other imports in index.ts
 * 
 * @see https://docs.sentry.io/platforms/node/
 */

import * as Sentry from '@sentry/node';
import type { Request, Response, NextFunction, ErrorRequestHandler, RequestHandler } from 'express';

// Import logger with fallback
let logger: any;
try {
  const loggerModule = require('./logger');
  logger = loggerModule.logger;
} catch {
  logger = { warn: console.warn, info: console.info, error: console.error };
}

// Environment configuration
const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Track initialization state
let isInitialized = false;

/**
 * Initialize Sentry SDK
 * 
 * Call this FIRST in your entry point, before other imports.
 * Safe to call multiple times - will only initialize once.
 */
export function initializeSentry(): void {
  if (isInitialized) {
    return;
  }

  if (!SENTRY_DSN) {
    logger.warn('SENTRY_DSN not configured - error tracking disabled');
    isInitialized = true;
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: NODE_ENV,
      
      // Only send errors in production (or if explicitly enabled)
      enabled: isProduction || process.env.SENTRY_ENABLED === 'true',
      
      // Sample rate for error events (1.0 = 100%)
      sampleRate: 1.0,
      
      // Sample rate for performance monitoring (0.1 = 10%)
      tracesSampleRate: isProduction ? 0.1 : 0,
      
      // Don't send PII by default
      sendDefaultPii: false,
      
      // Before sending, scrub sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        'Navigation cancelled',
        'NavigationDuplicated',
        'Network request failed',
        'NetworkError',
        'Too many requests',
      ],
    });

    isInitialized = true;
    logger.info({ dsn: SENTRY_DSN.substring(0, 20) + '...' }, 'Sentry initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Sentry');
    isInitialized = true;
  }
}

/**
 * Express request handler middleware (Sentry v8 compatible)
 * Captures request data for error context
 */
export function sentryRequestHandler(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Add request context to Sentry scope
    Sentry.withScope((scope) => {
      scope.setTag('url', req.url);
      scope.setTag('method', req.method);
      scope.setExtra('query', req.query);
    });
    next();
  };
}

/**
 * Express error handler middleware (Sentry v8 compatible)
 * Captures errors to Sentry
 */
export function sentryErrorHandler(): ErrorRequestHandler {
  return (err: Error, req: Request, _res: Response, next: NextFunction) => {
    // Only report 5xx errors
    const statusCode = (err as any).statusCode || 500;
    if (statusCode >= 500) {
      Sentry.captureException(err, {
        extra: {
          url: req.url,
          method: req.method,
          query: req.query,
          userId: (req as any).user?.fid,
        },
      });
    }
    next(err);
  };
}

/**
 * Manually capture an exception
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, any>
): string | undefined {
  if (!SENTRY_DSN) {
    logger.error({ error, context }, 'Error captured (Sentry disabled)');
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Manually capture a message
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context?: Record<string, any>
): string | undefined {
  if (!SENTRY_DSN) {
    logger.info({ message, level, context }, 'Message captured (Sentry disabled)');
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(fid: number, username?: string): void {
  Sentry.setUser({
    id: String(fid),
    username: username || `user-${fid}`,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Flush pending events before shutdown
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!SENTRY_DSN) {
    return true;
  }
  
  try {
    return await Sentry.close(timeout);
  } catch (error) {
    logger.warn({ error }, 'Failed to flush Sentry events');
    return false;
  }
}

export { Sentry };

export default {
  initializeSentry,
  sentryRequestHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  setSentryUser,
  clearSentryUser,
  addSentryBreadcrumb,
  flushSentry,
};
