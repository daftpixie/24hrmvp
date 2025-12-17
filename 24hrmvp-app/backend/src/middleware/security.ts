/**
 * Security Middleware Configuration
 * 
 * Configures Helmet.js and CORS for Farcaster Mini App security requirements.
 * Mini Apps run inside Warpcast iframe, requiring specific CSP and frame policies.
 * 
 * @see https://helmetjs.github.io/
 */

import helmet from 'helmet';
import cors from 'cors';
import type { RequestHandler, Request, Response, NextFunction } from 'express';

// Optional logger import - falls back to console if not installed
let logger: any;
try {
  const loggerModule = require('../lib/logger');
  logger = loggerModule.logger;
} catch {
  logger = { warn: console.warn };
}

/**
 * Helmet configuration for Farcaster Mini Apps
 * Uses simple static values only - no env vars in CSP to avoid undefined issues
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://auth.farcaster.xyz", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],  // Allow all HTTPS and WSS - simple and safe
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
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [
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
 */
export const corsMiddleware = cors({
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

/**
 * Additional security headers
 */
export const additionalSecurityHeaders: RequestHandler = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  next();
};

/**
 * Request size limits
 */
export const requestSizeLimits = {
  json: '10kb',
  urlencoded: '10kb',
  text: '10kb',
};

export const securityMiddleware: RequestHandler[] = [
  helmetMiddleware,
  corsMiddleware,
  additionalSecurityHeaders,
];

export default {
  helmetMiddleware,
  corsMiddleware,
  additionalSecurityHeaders,
  requestSizeLimits,
  securityMiddleware,
};
