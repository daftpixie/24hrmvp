"use strict";
/**
 * Security Middleware Configuration
 *
 * Configures Helmet.js and CORS for Farcaster Mini App security requirements.
 * Mini Apps run inside Warpcast iframe, requiring specific CSP and frame policies.
 *
 * UPDATED: Adds support for internal requests from Next.js API routes
 *
 * @see https://helmetjs.github.io/
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityMiddleware = exports.requestSizeLimits = exports.additionalSecurityHeaders = exports.internalRequestHandler = exports.corsMiddleware = exports.helmetMiddleware = void 0;
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
// Optional logger import - falls back to console if not installed
let logger;
try {
    const loggerModule = require('../lib/logger');
    logger = loggerModule.logger;
}
catch {
    logger = { warn: console.warn, info: console.info };
}
/**
 * Helmet configuration for Farcaster Mini Apps
 * Uses simple static values only - no env vars in CSP to avoid undefined issues
 */
exports.helmetMiddleware = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://auth.farcaster.xyz", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https:", "wss:"], // Allow all HTTPS and WSS - simple and safe
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            frameAncestors: ["'self'", "https://warpcast.com", "https://www.warpcast.com", "https://farcaster.xyz"],
            formAction: ["'self'"],
            baseUri: ["'self'"],
            objectSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
    dnsPrefetchControl: { allow: true },
    ieNoOpen: true,
});
/**
 * Get allowed CORS origins based on environment
 */
const getAllowedOrigins = () => {
    const origins = [
        'https://24hrmvp.xyz',
        'https://www.24hrmvp.xyz',
    ];
    // Add CORS_ORIGIN if defined
    if (process.env.CORS_ORIGIN) {
        process.env.CORS_ORIGIN.split(',').forEach(origin => {
            const trimmed = origin.trim();
            if (trimmed && !origins.includes(trimmed)) {
                origins.push(trimmed);
            }
        });
    }
    // Development origins
    if (process.env.NODE_ENV !== 'production') {
        origins.push('http://localhost:3000');
        origins.push('http://localhost:3001');
    }
    return origins;
};
/**
 * CORS configuration
 * UPDATED: Now checks for internal requests from Next.js API routes
 */
exports.corsMiddleware = (0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins();
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        logger.warn({ origin, allowedOrigins }, 'CORS request from unauthorized origin');
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Internal-Request'],
    exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
});
/**
 * Internal Request Handler Middleware
 *
 * NEW: Allows Next.js API routes to bypass CORS when calling backend
 * Next.js API routes will set X-Internal-Request: true header
 * These are same-origin requests from the Next.js server, not from browsers
 */
const internalRequestHandler = (req, res, next) => {
    // Check if this is an internal request from Next.js API routes
    if (req.headers['x-internal-request'] === 'true') {
        logger.info({
            path: req.path,
            method: req.method
        }, 'Internal request from Next.js API route');
        // Skip CORS for internal requests - they're server-to-server
        return next();
    }
    // Apply CORS for all other requests
    (0, exports.corsMiddleware)(req, res, next);
};
exports.internalRequestHandler = internalRequestHandler;
/**
 * Additional security headers
 */
const additionalSecurityHeaders = (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    next();
};
exports.additionalSecurityHeaders = additionalSecurityHeaders;
/**
 * Request size limits
 */
exports.requestSizeLimits = {
    json: '10kb',
    urlencoded: '10kb',
    text: '10kb',
};
/**
 * Complete security middleware stack
 * UPDATED: Now uses internalRequestHandler instead of direct corsMiddleware
 */
exports.securityMiddleware = [
    exports.helmetMiddleware,
    exports.internalRequestHandler, // CHANGED: Was corsMiddleware, now handles internal requests
    exports.additionalSecurityHeaders,
];
exports.default = {
    helmetMiddleware: exports.helmetMiddleware,
    corsMiddleware: exports.corsMiddleware,
    internalRequestHandler: exports.internalRequestHandler, // NEW: Export the internal request handler
    additionalSecurityHeaders: // NEW: Export the internal request handler
    exports.additionalSecurityHeaders,
    requestSizeLimits: exports.requestSizeLimits,
    securityMiddleware: exports.securityMiddleware,
};
//# sourceMappingURL=security.js.map