"use strict";
// ============================================
// 24HRMVP - ENHANCED AUTH MIDDLEWARE
// File: backend/src/middleware/gridAuth.ts
// Type-safe authentication for Grid routes
// 
// FIXED: Export both requireAdmin and requireAdminAuth
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.verifyFarcasterAuth = exports.requireAdmin = exports.ensureAuth = void 0;
exports.requireAuth = requireAuth;
exports.withOptionalAuth = withOptionalAuth;
exports.assertAuth = assertAuth;
exports.getAuthUser = getAuthUser;
exports.requireAdminAuth = requireAdminAuth;
const grid_1 = require("../types/grid");
const auth_1 = require("./auth");
Object.defineProperty(exports, "verifyFarcasterAuth", { enumerable: true, get: function () { return auth_1.verifyFarcasterAuth; } });
Object.defineProperty(exports, "optionalAuth", { enumerable: true, get: function () { return auth_1.optionalAuth; } });
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
function requireAuth(handler) {
    return [
        auth_1.verifyFarcasterAuth,
        async (req, res, next) => {
            // Double-check authentication after middleware
            if (!(0, grid_1.isAuthenticated)(req)) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
                return;
            }
            try {
                // Type assertion is safe here because we verified above
                await handler(req, res, next);
            }
            catch (error) {
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
const ensureAuth = (req, res, next) => {
    if (!(0, grid_1.isAuthenticated)(req)) {
        res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Authentication required',
        });
        return;
    }
    next();
};
exports.ensureAuth = ensureAuth;
function withOptionalAuth(handler) {
    return [
        auth_1.optionalAuth,
        async (req, res, next) => {
            try {
                await handler(req, res, next);
            }
            catch (error) {
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
function assertAuth(req) {
    if (!(0, grid_1.isAuthenticated)(req)) {
        const error = new Error('Authentication required');
        error.status = 401;
        throw error;
    }
}
/**
 * Get authenticated user from request or return null.
 * Useful when you need user data but don't want to throw.
 */
function getAuthUser(req) {
    if ((0, grid_1.isAuthenticated)(req)) {
        return req.user;
    }
    return null;
}
function requireAdminAuth(handler) {
    // Import dynamically to avoid circular dependency
    const { requireAdmin: baseRequireAdmin } = require('./auth');
    return [
        auth_1.verifyFarcasterAuth,
        baseRequireAdmin,
        async (req, res, next) => {
            if (!(0, grid_1.isAuthenticated)(req)) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
                return;
            }
            try {
                await handler(req, res, next);
            }
            catch (error) {
                next(error);
            }
        },
    ];
}
// Alias for backward compatibility
exports.requireAdmin = requireAdminAuth;
//# sourceMappingURL=gridAuth.js.map