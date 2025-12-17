"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sentry = void 0;
exports.initializeSentry = initializeSentry;
exports.sentryRequestHandler = sentryRequestHandler;
exports.sentryErrorHandler = sentryErrorHandler;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
exports.setSentryUser = setSentryUser;
exports.clearSentryUser = clearSentryUser;
exports.addSentryBreadcrumb = addSentryBreadcrumb;
exports.flushSentry = flushSentry;
const Sentry = __importStar(require("@sentry/node"));
exports.Sentry = Sentry;
// Import logger with fallback
let logger;
try {
    const loggerModule = require('./logger');
    logger = loggerModule.logger;
}
catch {
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
function initializeSentry() {
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
    }
    catch (error) {
        logger.error({ error }, 'Failed to initialize Sentry');
        isInitialized = true;
    }
}
/**
 * Express request handler middleware (Sentry v8 compatible)
 * Captures request data for error context
 */
function sentryRequestHandler() {
    return (req, _res, next) => {
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
function sentryErrorHandler() {
    return (err, req, _res, next) => {
        // Only report 5xx errors
        const statusCode = err.statusCode || 500;
        if (statusCode >= 500) {
            Sentry.captureException(err, {
                extra: {
                    url: req.url,
                    method: req.method,
                    query: req.query,
                    userId: req.user?.fid,
                },
            });
        }
        next(err);
    };
}
/**
 * Manually capture an exception
 */
function captureException(error, context) {
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
function captureMessage(message, level = 'info', context) {
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
function setSentryUser(fid, username) {
    Sentry.setUser({
        id: String(fid),
        username: username || `user-${fid}`,
    });
}
/**
 * Clear user context
 */
function clearSentryUser() {
    Sentry.setUser(null);
}
/**
 * Add breadcrumb for debugging
 */
function addSentryBreadcrumb(message, category, data) {
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
async function flushSentry(timeout = 2000) {
    if (!SENTRY_DSN) {
        return true;
    }
    try {
        return await Sentry.close(timeout);
    }
    catch (error) {
        logger.warn({ error }, 'Failed to flush Sentry events');
        return false;
    }
}
exports.default = {
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
//# sourceMappingURL=sentry.js.map