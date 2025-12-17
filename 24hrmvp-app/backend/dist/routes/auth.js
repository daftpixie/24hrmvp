"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unified Authentication Routes
 * Replaces: auth.ts and wallet-auth.ts
 *
 * Implements:
 * - Farcaster Quick Auth (Mini App context)
 * - SIWE (Ethereum Wallet context)
 * - Unified Session Management
 */
const express_1 = require("express");
const zod_1 = require("zod"); // Ensure zod is installed: npm install zod
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const nonce_service_1 = require("../services/nonce.service");
const siwe_service_1 = require("../services/siwe.service");
const auth_service_1 = require("../services/auth.service");
const router = (0, express_1.Router)();
const logger = console; // Replace with your actual logger import
// --- Validation Schemas ---
const siweNonceSchema = zod_1.z.object({
    address: zod_1.z.string().min(1),
    chainId: zod_1.z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
});
const siweVerifySchema = zod_1.z.object({
    message: zod_1.z.string().min(1),
    signature: zod_1.z.string().regex(/^0x[a-fA-F0-9]+$/),
    address: zod_1.z.string().min(1),
});
/**
 * GET /api/auth/providers
 * Returns available auth methods for the frontend UI
 */
router.get('/providers', (_req, res) => {
    res.json({
        success: true,
        providers: {
            farcaster: { enabled: true, context: 'miniapp' },
            siwe: { enabled: true, context: 'browser' }
        }
    });
});
/**
 * POST /api/auth/siwe/nonce
 * Generates EIP-4361 nonce for SIWE
 */
router.post('/siwe/nonce', async (req, res) => {
    try {
        const { address, chainId } = siweNonceSchema.parse(req.body);
        if (!(0, siwe_service_1.isValidEthAddress)(address)) {
            return res.status(400).json({ success: false, error: 'Invalid address' });
        }
        const { nonce, expiresAt } = await (0, nonce_service_1.createNonce)('EVM');
        const message = (0, siwe_service_1.createSiweMessage)({ address, nonce, chainId: chainId || 1 });
        res.json({ success: true, nonce, message, expiresAt });
    }
    catch (error) {
        logger.error({ error }, 'Nonce generation failed');
        res.status(400).json({ success: false, error: 'Invalid request' });
    }
});
/**
 * POST /api/auth/siwe/verify
 * Verifies SIWE signature and returns user + tokens
 * NOTE: Does NOT set cookies. Next.js API Route (BFF) should handle cookie setting.
 */
router.post('/siwe/verify', async (req, res) => {
    try {
        const { message, signature, address } = siweVerifySchema.parse(req.body);
        // 1. Verify Signature
        const result = await (0, siwe_service_1.verifySiweMessage)(message, signature);
        if (!result.success || !result.address) {
            return res.status(401).json({
                success: false,
                error: { code: 'VERIFICATION_FAILED', message: result.error }
            });
        }
        // 2. Find/Create User
        const { user, isNew } = await (0, auth_service_1.findOrCreateUserByWallet)(result.address, 'EVM', result.chainId);
        if (user.isBanned) {
            return res.status(403).json({ success: false, error: 'User banned' });
        }
        // 3. Generate Token (JWT)
        const tokens = (0, auth_service_1.generateTokens)({
            userId: user.id,
            fid: user.fid || undefined,
            walletAddress: result.address,
            chainType: 'EVM',
            authSource: 'siwe'
        });
        // 4. Return Data (Let Frontend/Next.js handle cookie persistence)
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                pfpUrl: user.pfpUrl,
                walletAddress: result.address
            },
            tokens, // Access & Refresh tokens
            isNewUser: isNew
        });
    }
    catch (error) {
        logger.error({ error }, 'SIWE verify error');
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});
/**
 * POST /api/auth/verify
 * Unified verification for Farcaster/Custom tokens
 */
router.post('/verify', auth_1.verifyAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id, fid, username, displayName, pfpUrl, authSource } = authReq.user;
        // Upsert logic for Farcaster/Other providers
        const user = await index_1.prisma.user.upsert({
            where: { id },
            update: { lastActiveAt: new Date() },
            create: {
                id,
                fid: fid || undefined,
                username,
                displayName,
                pfpUrl,
                primaryAuthProvider: authSource === 'farcaster' ? 'FARCASTER' : 'SIWE'
            }
        });
        res.json({ success: true, user: { ...user, authSource } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Verify failed' });
    }
});
/**
 * GET /api/auth/me
 * Returns full profile for the authenticated session
 */
router.get('/me', auth_1.verifyAuth, async (req, res) => {
    const authReq = req;
    if (!authReq.user) {
        return res.status(401).json({ success: false });
    }
    const user = await index_1.prisma.user.findUnique({
        where: { id: authReq.user.id },
        include: {
            cryptoWallets: { take: 5 },
            _count: { select: { votes: true, ideas: true } }
        }
    });
    if (!user) {
        return res.status(404).json({ success: false });
    }
    res.json({
        success: true,
        user: { ...user, authSource: authReq.user.authSource }
    });
});
/**
 * POST /api/auth/logout
 * Single source of truth for logout logging
 */
router.post('/logout', auth_1.optionalAuth, (req, res) => {
    // Logic to invalidate refresh tokens in DB if applicable
    res.json({ success: true, message: 'Logged out' });
});
/**
 * GET /api/auth/session
 * Compatibility alias for /me to support existing frontend calls
 */
router.get('/session', auth_1.verifyAuth, async (req, res) => {
    const authReq = req;
    if (!authReq.user) {
        return res.status(401).json({ success: false, error: 'No active session' });
    }
    // Safe property access using fallback for compatibility
    const walletAddr = authReq.user.primaryWalletAddress || authReq.user.walletAddress || null;
    res.json({
        success: true,
        user: {
            ...authReq.user,
            walletAddress: walletAddr
        }
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map