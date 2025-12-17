"use strict";
/**
 * Authentication Types
 *
 * Type definitions for multichain authentication.
 * NOTE: Express Request.user is augmented in types/express.d.ts
 *
 * @version 2.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authProviderToSource = authProviderToSource;
exports.authSourceToProvider = authSourceToProvider;
// ============================================
// AUTH PROVIDER HELPERS
// ============================================
/**
 * Map AuthProvider enum to AuthSource string
 */
function authProviderToSource(provider) {
    switch (provider) {
        case 'FARCASTER':
            return 'farcaster';
        case 'SIWE':
            return 'siwe';
        case 'SIWS':
            return 'siws';
        default:
            return 'farcaster';
    }
}
/**
 * Map AuthSource string to AuthProvider enum
 */
function authSourceToProvider(source) {
    switch (source) {
        case 'farcaster':
            return 'FARCASTER';
        case 'siwe':
            return 'SIWE';
        case 'siws':
            return 'SIWS';
        default:
            return 'FARCASTER';
    }
}
//# sourceMappingURL=auth.js.map