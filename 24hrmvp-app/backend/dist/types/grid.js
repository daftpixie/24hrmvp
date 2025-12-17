"use strict";
// ============================================
// 24HRMVP - THE GRID TYPE DEFINITIONS
// File: backend/src/types/grid.ts
// Complete type exports for Grid Phase 1
// 
// UPDATED: Multichain auth support (Dec 2025)
// FIXED: fid type compatibility with Express augmentation
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainType = exports.SocialPlatform = exports.ModerationEntityType = exports.ModerationStatus = exports.PostType = void 0;
exports.isAuthenticated = isAuthenticated;
exports.assertAuthenticated = assertAuthenticated;
exports.hasFarcasterAuth = hasFarcasterAuth;
exports.hasWalletAuth = hasWalletAuth;
exports.isSIWEAuth = isSIWEAuth;
exports.isSIWSAuth = isSIWSAuth;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PostType", { enumerable: true, get: function () { return client_1.PostType; } });
Object.defineProperty(exports, "ModerationStatus", { enumerable: true, get: function () { return client_1.ModerationStatus; } });
Object.defineProperty(exports, "ModerationEntityType", { enumerable: true, get: function () { return client_1.ModerationEntityType; } });
Object.defineProperty(exports, "SocialPlatform", { enumerable: true, get: function () { return client_1.SocialPlatform; } });
Object.defineProperty(exports, "ChainType", { enumerable: true, get: function () { return client_1.ChainType; } });
/**
 * Type guard to check if request has authenticated user
 *
 * UPDATED: No longer requires fid - wallet-only users are valid
 * Check for id and username which are always present
 */
function isAuthenticated(req) {
    return req.user !== undefined &&
        req.user !== null &&
        typeof req.user.id === 'string' &&
        typeof req.user.username === 'string';
}
/**
 * Assert request has authenticated user (throws if not)
 */
function assertAuthenticated(req) {
    if (!isAuthenticated(req)) {
        throw new Error('Authentication required');
    }
}
/**
 * Check if authenticated user has Farcaster auth (has FID)
 */
function hasFarcasterAuth(req) {
    return isAuthenticated(req) && req.user.fid !== undefined;
}
/**
 * Check if authenticated user has wallet auth
 */
function hasWalletAuth(req) {
    return isAuthenticated(req) && req.user.walletAddress !== undefined;
}
/**
 * Check if user authenticated via SIWE (EVM wallet)
 */
function isSIWEAuth(req) {
    return isAuthenticated(req) && req.user.authSource === 'siwe';
}
/**
 * Check if user authenticated via SIWS (Solana wallet)
 */
function isSIWSAuth(req) {
    return isAuthenticated(req) && req.user.authSource === 'siws';
}
//# sourceMappingURL=grid.js.map