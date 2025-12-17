"use strict";
/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse and ensures fair usage.
 * Uses express-rate-limit with memory store (suitable for single-server beta).
 *
 * Features:
 * - Rate limits by authenticated FID when available, falls back to IP
 * - Feature-specific rate limits (voting, chat, forum, ideas)
 * - Structured logging for rate limit events
 * - Skips rate limiting for health checks
 *
 * @see https://www.npmjs.com/package/express-rate-limit
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.votingLimiter = exports.apiLimiter = exports.paymentLimiter = exports.strictLimiter = exports.ideaLimiter = exports.forumPostLimiter = exports.chatLimiter = exports.voteLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Optional logger import - falls back to console if not installed
let logger;
try {
    const loggerModule = require('../lib/logger');
    logger = loggerModule.logger;
}
catch {
    logger = { warn: console.warn };
}
/**
 * Custom key generator - uses FID for authenticated users, IP otherwise
 * This prevents a single user from using multiple IPs to bypass limits
 */
const keyGenerator = (req) => {
    const user = req.user;
    if (user?.fid) {
        return `fid:${user.fid}`;
    }
    // Fall back to IP (Railway provides real IP via x-forwarded-for)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded?.split(',')[0] || req.ip || 'unknown';
    return `ip:${ip}`;
};
/**
 * IP-only key generator for unauthenticated endpoints (auth, public)
 */
const ipKeyGenerator = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded?.split(',')[0] || req.ip || 'unknown';
    return `ip:${ip}`;
};
/**
 * Custom handler for rate limit exceeded
 */
const rateLimitHandler = (req, res) => {
    const key = keyGenerator(req);
    logger.warn({
        key,
        path: req.path,
        method: req.method
    }, 'Rate limit exceeded');
    res.status(429).json({
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests, please slow down',
            retryAfter: res.getHeader('Retry-After'),
        },
    });
};
/**
 * Base rate limit configuration
 */
const baseConfig = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute default
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    keyGenerator,
    handler: rateLimitHandler,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path.startsWith('/health/');
    },
};
/**
 * General API rate limiter
 * Default: 100 requests per minute per user/IP
 */
exports.generalLimiter = (0, express_rate_limit_1.default)({
    ...baseConfig,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    message: 'Too many requests from this user, please try again later',
});
/**
 * Authentication rate limiter (stricter)
 * Prevents brute force attacks on auth endpoints
 * 10 requests per minute per IP
 */
exports.authLimiter = (0, express_rate_limit_1.default)({
    ...baseConfig,
    max: 10,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => `auth:${ipKeyGenerator(req)}`,
    message: 'Too many authentication attempts, please try again later',
});
/**
 * Vote endpoint rate limiter
 * 20 votes per minute per user (allows bursts, prevents spam)
 */
exports.voteLimiter = (0, express_rate_limit_1.default)({
    ...baseConfig,
    max: 20,
    windowMs: 60 * 1000, // 1 minute
    message: 'Voting too quickly, please slow down',
});
/**
 * Chat message rate limiter
 * 30 messages per minute per user
 */
exports.chatLimiter = (0, express_rate_limit_1.default)({
    ...baseConfig,
    max: 30,
    windowMs: 60 * 1000,
    message: 'Sending messages too quickly, please slow down',
});
/**
 * Forum post rate limiter
 * 5 posts per minute per user (prevents spam)
 */
exports.forumPostLimiter = (0, express_rate_limit_1.default)({
    ...baseConfig,
    max: 5,
    windowMs: 60 * 1000,
    message: 'Creating posts too quickly, please slow down',
});
/**
 * Idea submission rate limiter
 * 3 ideas per hour per user
 */
exports.ideaLimiter = (0, express_rate_limit_1.default)({
    ...baseConfig,
    max: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many idea submissions, please try again later',
});
/**
 * Strict rate limiter for sensitive operations
 * 5 requests per minute
 */
exports.strictLimiter = (0, express_rate_limit_1.default)({
    ...baseConfig,
    max: 5,
    windowMs: 60 * 1000,
    message: 'Too many requests for this operation',
});
/**
 * Payment endpoint rate limiter
 * 10 requests per minute per user
 */
exports.paymentLimiter = (0, express_rate_limit_1.default)({
    ...baseConfig,
    max: 10,
    windowMs: 60 * 1000,
    message: 'Too many payment requests, please slow down',
});
/**
 * Legacy aliases for compatibility with existing code
 * @deprecated Use specific limiters instead
 */
exports.apiLimiter = exports.generalLimiter;
exports.votingLimiter = exports.voteLimiter;
exports.default = {
    generalLimiter: exports.generalLimiter,
    authLimiter: exports.authLimiter,
    voteLimiter: exports.voteLimiter,
    chatLimiter: exports.chatLimiter,
    forumPostLimiter: exports.forumPostLimiter,
    ideaLimiter: exports.ideaLimiter,
    strictLimiter: exports.strictLimiter,
    paymentLimiter: exports.paymentLimiter,
    // Legacy aliases
    apiLimiter: exports.apiLimiter,
    votingLimiter: exports.votingLimiter,
};
//# sourceMappingURL=rateLimiter.js.map