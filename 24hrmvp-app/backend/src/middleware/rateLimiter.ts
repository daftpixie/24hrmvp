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

import rateLimit, { Options } from 'express-rate-limit';
import type { Request, Response } from 'express';

// Optional logger import - falls back to console if not installed
let logger: any;
try {
  const loggerModule = require('../lib/logger');
  logger = loggerModule.logger;
} catch {
  logger = { warn: console.warn };
}

/**
 * Custom key generator - uses FID for authenticated users, IP otherwise
 * This prevents a single user from using multiple IPs to bypass limits
 */
const keyGenerator = (req: Request): string => {
  const user = (req as any).user;
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
const ipKeyGenerator = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) 
    ? forwarded[0] 
    : forwarded?.split(',')[0] || req.ip || 'unknown';
  return `ip:${ip}`;
};

/**
 * Custom handler for rate limit exceeded
 */
const rateLimitHandler = (req: Request, res: Response): void => {
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
const baseConfig: Partial<Options> = {
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
export const generalLimiter = rateLimit({
  ...baseConfig,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this user, please try again later',
});

/**
 * Authentication rate limiter (stricter)
 * Prevents brute force attacks on auth endpoints
 * 10 requests per minute per IP
 */
export const authLimiter = rateLimit({
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
export const voteLimiter = rateLimit({
  ...baseConfig,
  max: 20,
  windowMs: 60 * 1000, // 1 minute
  message: 'Voting too quickly, please slow down',
});

/**
 * Chat message rate limiter
 * 30 messages per minute per user
 */
export const chatLimiter = rateLimit({
  ...baseConfig,
  max: 30,
  windowMs: 60 * 1000,
  message: 'Sending messages too quickly, please slow down',
});

/**
 * Forum post rate limiter
 * 5 posts per minute per user (prevents spam)
 */
export const forumPostLimiter = rateLimit({
  ...baseConfig,
  max: 5,
  windowMs: 60 * 1000,
  message: 'Creating posts too quickly, please slow down',
});

/**
 * Idea submission rate limiter
 * 3 ideas per hour per user
 */
export const ideaLimiter = rateLimit({
  ...baseConfig,
  max: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many idea submissions, please try again later',
});

/**
 * Strict rate limiter for sensitive operations
 * 5 requests per minute
 */
export const strictLimiter = rateLimit({
  ...baseConfig,
  max: 5,
  windowMs: 60 * 1000,
  message: 'Too many requests for this operation',
});

/**
 * Payment endpoint rate limiter
 * 10 requests per minute per user
 */
export const paymentLimiter = rateLimit({
  ...baseConfig,
  max: 10,
  windowMs: 60 * 1000,
  message: 'Too many payment requests, please slow down',
});

/**
 * Legacy aliases for compatibility with existing code
 * @deprecated Use specific limiters instead
 */
export const apiLimiter = generalLimiter;
export const votingLimiter = voteLimiter;

export default {
  generalLimiter,
  authLimiter,
  voteLimiter,
  chatLimiter,
  forumPostLimiter,
  ideaLimiter,
  strictLimiter,
  paymentLimiter,
  // Legacy aliases
  apiLimiter,
  votingLimiter,
};
