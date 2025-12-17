"use strict";
/**
 * Unified Authentication Middleware
 *
 * Server-side authentication for 24HRMVP supporting multiple providers:
 * - Farcaster Quick Auth (Mini App context)
 * - SIWE/SIWS wallet authentication (Browser context)
 *
 * @see https://miniapps.farcaster.xyz/docs/sdk/quick-auth
 * @version 2.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = exports.authenticate = exports.requireWallet = exports.checkNotBanned = exports.requireUserId = exports.requireFid = exports.requireAdmin = exports.optionalAuth = exports.verifyFarcasterAuth = exports.verifyAuth = void 0;
exports.isAuthenticated = isAuthenticated;
exports.hasFarcasterAuth = hasFarcasterAuth;
exports.hasWalletAuth = hasWalletAuth;
const quick_auth_1 = require("@farcaster/quick-auth");
const index_1 = require("../index");
const auth_service_1 = require("../services/auth.service");
// Optional imports with fallbacks
let authLogger;
let setSentryUser;
let clearSentryUser;
let addSentryBreadcrumb;
try {
    const loggerModule = require('../lib/logger');
    authLogger = loggerModule.authLogger || loggerModule.logger || {
        debug: console.log,
        warn: console.warn,
        info: console.info,
        error: console.error
    };
}
catch {
    authLogger = {
        debug: console.log,
        warn: console.warn,
        info: console.info,
        error: console.error
    };
}
try {
    const sentryModule = require('../lib/sentry');
    setSentryUser = sentryModule.setSentryUser || (() => { });
    clearSentryUser = sentryModule.clearSentryUser || (() => { });
    addSentryBreadcrumb = sentryModule.addSentryBreadcrumb || (() => { });
}
catch {
    setSentryUser = () => { };
    clearSentryUser = () => { };
    addSentryBreadcrumb = () => { };
}
// Type guard
function isAuthenticated(req) {
    return req.user !== undefined && req.user !== null && typeof req.user.id === 'string';
}
// Check if user has Farcaster auth
function hasFarcasterAuth(req) {
    return isAuthenticated(req) && req.user.fid !== undefined;
}
// Check if user has wallet auth
function hasWalletAuth(req) {
    return isAuthenticated(req) && req.user.walletAddress !== undefined;
}
// ============================================
// INITIALIZE CLIENTS
// ============================================
const quickAuthClient = (0, quick_auth_1.createClient)();
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Extract JWT token from Authorization header
 */
function extractToken(req) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return null;
    }
    if (!authorization.startsWith('Bearer ')) {
        return null;
    }
    return authorization.substring(7);
}
/**
 * Try to verify token with Farcaster Quick Auth
 */
async function tryFarcasterAuth(token) {
    try {
        const payload = await quickAuthClient.verifyJwt({
            token,
            domain: process.env.APP_DOMAIN || '24hrmvp.xyz',
        });
        if (!payload || !payload.sub) {
            return null;
        }
        const fid = typeof payload.sub === 'number' ? payload.sub : parseInt(payload.sub, 10);
        if (isNaN(fid) || fid <= 0) {
            return null;
        }
        // Upsert user in database
        const user = await index_1.prisma.user.upsert({
            where: { fid },
            update: { lastSeenAt: new Date() },
            create: {
                fid,
                username: payload.username || `user-${fid}`,
                displayName: payload.displayName,
                pfpUrl: payload.pfpUrl,
                primaryAuthProvider: 'FARCASTER',
            },
        });
        return {
            id: user.id,
            fid: user.fid ?? undefined,
            username: user.username,
            displayName: user.displayName || undefined,
            pfpUrl: user.pfpUrl || undefined,
            authSource: 'farcaster',
            isAdmin: user.isAdmin,
            isBanned: user.isBanned,
        };
    }
    catch (error) {
        authLogger.debug({ error: error.message }, 'Farcaster Quick Auth failed, will try custom JWT');
        return null;
    }
}
/**
 * Try to verify token with custom JWT (for wallet auth)
 */
async function tryCustomJwtAuth(token) {
    const payload = (0, auth_service_1.verifyAccessToken)(token);
    if (!payload) {
        return null;
    }
    // Fetch full user data
    const user = await index_1.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            fid: true,
            username: true,
            displayName: true,
            pfpUrl: true,
            isAdmin: true,
            isBanned: true,
            primaryWalletAddress: true,
            primaryAuthProvider: true,
        },
    });
    if (!user) {
        authLogger.warn({ userId: payload.userId }, 'JWT valid but user not found');
        return null;
    }
    // Update last seen (non-blocking)
    index_1.prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() },
    }).catch(() => { });
    return {
        id: user.id,
        fid: user.fid ?? undefined,
        username: user.username,
        displayName: user.displayName || undefined,
        pfpUrl: user.pfpUrl || undefined,
        walletAddress: payload.walletAddress || user.primaryWalletAddress || undefined,
        chainType: payload.chainType,
        chainId: payload.chainId,
        authSource: payload.authSource,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
    };
}
// ============================================
// PRIMARY MIDDLEWARE
// ============================================
/**
 * Unified authentication middleware
 */
const verifyAuth = async (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        authLogger.debug({ path: req.path }, 'No authorization token provided');
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'No authentication token provided',
            },
        });
        return;
    }
    // Try Farcaster Quick Auth first
    let user = await tryFarcasterAuth(token);
    // Fall back to custom JWT
    if (!user) {
        user = await tryCustomJwtAuth(token);
    }
    if (!user) {
        authLogger.debug({ path: req.path }, 'All authentication methods failed');
        res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired authentication token',
            },
        });
        return;
    }
    // Check if user is banned
    if (user.isBanned) {
        authLogger.warn({ userId: user.id }, 'Banned user attempted access');
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'User account is suspended',
            },
        });
        return;
    }
    // Attach user to request
    req.user = user;
    // Set Sentry context
    setSentryUser(user.fid || user.id, user.username);
    addSentryBreadcrumb('User authenticated', 'auth', {
        userId: user.id,
        authSource: user.authSource,
        fid: user.fid,
    });
    authLogger.debug({
        userId: user.id,
        authSource: user.authSource,
        path: req.path
    }, 'User authenticated');
    next();
};
exports.verifyAuth = verifyAuth;
exports.authenticate = exports.verifyAuth;
exports.authenticateUser = exports.verifyAuth;
/**
 * Legacy alias
 */
exports.verifyFarcasterAuth = exports.verifyAuth;
/**
 * Optional authentication middleware
 */
const optionalAuth = async (req, _res, next) => {
    const token = extractToken(req);
    if (!token) {
        next();
        return;
    }
    try {
        let user = await tryFarcasterAuth(token);
        if (!user) {
            user = await tryCustomJwtAuth(token);
        }
        if (user && !user.isBanned) {
            req.user = user;
            setSentryUser(user.fid || user.id, user.username);
        }
    }
    catch (error) {
        authLogger.debug({ error }, 'Optional auth failed, continuing without user');
    }
    next();
};
exports.optionalAuth = optionalAuth;
// ============================================
// AUTHORIZATION MIDDLEWARE
// ============================================
/**
 * Require admin access
 */
const requireAdmin = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
            },
        });
        return;
    }
    const user = await index_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { isAdmin: true, isBanned: true },
    });
    if (user?.isBanned) {
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'User account is suspended',
            },
        });
        return;
    }
    if (user?.isAdmin) {
        authLogger.info({ userId: req.user.id, path: req.path }, 'Admin access granted (database)');
        next();
        return;
    }
    // Fallback: Check ADMIN_FIDS environment variable
    if (req.user.fid) {
        const adminFids = (process.env.ADMIN_FIDS || '')
            .split(',')
            .map((fid) => parseInt(fid.trim(), 10))
            .filter((fid) => !isNaN(fid));
        if (adminFids.includes(req.user.fid)) {
            authLogger.info({ fid: req.user.fid, path: req.path }, 'Admin access granted (env override)');
            next();
            return;
        }
    }
    authLogger.warn({ userId: req.user.id, path: req.path }, 'Non-admin user attempted admin access');
    res.status(403).json({
        success: false,
        error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
        },
    });
};
exports.requireAdmin = requireAdmin;
/**
 * Require specific FID
 */
const requireFid = (paramName = 'fid') => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        if (!req.user.fid) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'This resource requires Farcaster authentication',
                },
            });
            return;
        }
        const targetFid = parseInt(req.params[paramName], 10);
        if (isNaN(targetFid)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: `Invalid ${paramName} parameter`,
                },
            });
            return;
        }
        if (req.user.fid !== targetFid) {
            authLogger.warn({
                userFid: req.user.fid,
                targetFid,
                path: req.path,
            }, 'User attempted to access another user\'s resource');
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You can only access your own resources',
                },
            });
            return;
        }
        next();
    };
};
exports.requireFid = requireFid;
/**
 * Require specific user ID
 */
const requireUserId = (paramName = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const targetUserId = req.params[paramName];
        if (!targetUserId) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: `Invalid ${paramName} parameter`,
                },
            });
            return;
        }
        if (req.user.id !== targetUserId) {
            authLogger.warn({
                userId: req.user.id,
                targetUserId,
                path: req.path,
            }, 'User attempted to access another user\'s resource');
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You can only access your own resources',
                },
            });
            return;
        }
        next();
    };
};
exports.requireUserId = requireUserId;
/**
 * Check if user is not banned
 */
const checkNotBanned = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
            },
        });
        return;
    }
    const user = await index_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { isBanned: true },
    });
    if (user?.isBanned) {
        authLogger.warn({ userId: req.user.id }, 'Banned user attempted access');
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'User account is suspended',
            },
        });
        return;
    }
    next();
};
exports.checkNotBanned = checkNotBanned;
/**
 * Require wallet authentication
 */
const requireWallet = async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
            },
        });
        return;
    }
    if (!req.user.walletAddress && req.user.authSource === 'farcaster') {
        // Check if user has linked wallet
        try {
            const wallet = await index_1.prisma.cryptoWallet.findFirst({
                where: { userId: req.user.id },
                select: { address: true, chainType: true },
            });
            if (wallet) {
                req.user.walletAddress = wallet.address;
                req.user.chainType = wallet.chainType;
                next();
                return;
            }
        }
        catch (error) {
            authLogger.error({ error }, 'Wallet check failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to verify wallet status',
                },
            });
            return;
        }
        res.status(403).json({
            success: false,
            error: {
                code: 'WALLET_REQUIRED',
                message: 'This action requires a linked wallet',
            },
        });
        return;
    }
    if (!req.user.walletAddress) {
        res.status(403).json({
            success: false,
            error: {
                code: 'WALLET_REQUIRED',
                message: 'This action requires wallet authentication',
            },
        });
        return;
    }
    next();
};
exports.requireWallet = requireWallet;
exports.default = {
    verifyAuth: exports.verifyAuth,
    verifyFarcasterAuth: exports.verifyFarcasterAuth,
    optionalAuth: exports.optionalAuth,
    requireAdmin: exports.requireAdmin,
    requireFid: exports.requireFid,
    requireUserId: exports.requireUserId,
    requireWallet: exports.requireWallet,
    checkNotBanned: exports.checkNotBanned,
    authenticate: exports.verifyAuth,
    authenticateUser: exports.verifyAuth,
    isAuthenticated,
    hasFarcasterAuth,
    hasWalletAuth,
};
//# sourceMappingURL=auth.js.map