// ============================================
// 24HRMVP - ENHANCED AUTH MIDDLEWARE
// File: backend/src/middleware/gridAuth.ts
// Type-safe authentication for Grid routes
// 
// FIXED: Export both requireAdmin and requireAdminAuth
// ============================================

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest, AuthUser, isAuthenticated } from '../types/grid';
import { verifyFarcasterAuth, optionalAuth as baseOptionalAuth } from './auth';

/**
 * Type-safe handler for routes requiring authentication.
 * Guarantees req.user is defined in the handler.
 */
export type AuthenticatedHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

/**
 * Wrapper that provides type-safe authenticated request handling.
 * 
 * Usage:
 * ```typescript
 * router.post('/posts', ...requireAuth(async (req, res) => {
 *   // req.user is guaranteed to be defined here
 *   const userId = req.user.id;
 * }));
 * ```
 */
export function requireAuth(handler: AuthenticatedHandler): RequestHandler[] {
  return [
    verifyFarcasterAuth,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Double-check authentication after middleware
      if (!isAuthenticated(req)) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      try {
        // Type assertion is safe here because we verified above
        await handler(req as AuthRequest, res, next);
      } catch (error) {
        next(error);
      }
    },
  ];
}

/**
 * Middleware that ensures req.user is defined after authentication.
 * Use this when you need the middleware separately from the handler.
 * 
 * Usage:
 * ```typescript
 * router.post('/posts', verifyFarcasterAuth, ensureAuth, async (req: AuthRequest, res) => {
 *   const userId = req.user.id; // Safe!
 * });
 * ```
 */
export const ensureAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isAuthenticated(req)) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }
  next();
};

/**
 * Async handler wrapper for routes with optional authentication.
 * Use when you want to access user data if available but not require it.
 * 
 * Usage:
 * ```typescript
 * router.get('/posts', optionalAuth, withOptionalAuth(async (req, res) => {
 *   const userId = req.user?.id; // May be undefined
 * }));
 * ```
 */
export type OptionalAuthHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export function withOptionalAuth(handler: OptionalAuthHandler): RequestHandler[] {
  return [
    baseOptionalAuth,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  ];
}

/**
 * Type guard middleware for use in route handlers.
 * Throws if user is not authenticated.
 * 
 * Usage in handler:
 * ```typescript
 * router.post('/posts', verifyFarcasterAuth, async (req: Request, res) => {
 *   assertAuth(req); // Throws if not authenticated
 *   // Now TypeScript knows req.user is defined
 *   const userId = req.user.id;
 * });
 * ```
 */
export function assertAuth(req: Request): asserts req is AuthRequest {
  if (!isAuthenticated(req)) {
    const error = new Error('Authentication required') as Error & { status: number };
    error.status = 401;
    throw error;
  }
}

/**
 * Get authenticated user from request or return null.
 * Useful when you need user data but don't want to throw.
 */
export function getAuthUser(req: Request): AuthUser | null {
  if (isAuthenticated(req)) {
    return req.user;
  }
  return null;
}

/**
 * Admin authentication wrapper.
 * Verifies user is authenticated AND has admin privileges.
 * 
 * Usage:
 * ```typescript
 * router.get('/admin/queue', ...requireAdmin(async (req, res) => {
 *   // req.user is guaranteed to be defined and is admin
 * }));
 * ```
 */
export type AdminHandler = AuthenticatedHandler;

export function requireAdminAuth(handler: AdminHandler): RequestHandler[] {
  // Import dynamically to avoid circular dependency
  const { requireAdmin: baseRequireAdmin } = require('./auth');
  
  return [
    verifyFarcasterAuth,
    baseRequireAdmin,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!isAuthenticated(req)) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      try {
        await handler(req as AuthRequest, res, next);
      } catch (error) {
        next(error);
      }
    },
  ];
}

// Alias for backward compatibility
export const requireAdmin = requireAdminAuth;

// Re-export base auth functions for convenience
export { verifyFarcasterAuth, baseOptionalAuth as optionalAuth };
