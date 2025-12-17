"use strict";
/**
 * Wallet Authentication Routes
 *
 * Endpoints for SIWE (Ethereum) and SIWS (Solana) wallet authentication.
 * Supports browser-based authentication when outside Farcaster Mini App context.
 *
 * Endpoints:
 * - GET  /nonce           - Generate signing nonce
 * - POST /verify/siwe     - Verify Ethereum wallet signature
 * - POST /verify/siws     - Verify Solana wallet signature
 * - POST /link            - Link wallet to existing account
 * - POST /refresh         - Refresh access token
 * - GET  /wallets         - List user's connected wallets
 * - DELETE /wallets/:id   - Unlink a wallet
 *
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const nonce_service_1 = require("../services/nonce.service");
const siwe_service_1 = require("../services/siwe.service");
const siws_service_1 = require("../services/siws.service");
const auth_service_1 = require("../services/auth.service");
// Logger (optional)
let logger;
try {
    const loggerModule = require('../lib/logger');
    logger = loggerModule.authLogger || loggerModule.logger || console;
}
catch {
    logger = console;
}
const router = (0, express_1.Router)();
// ============================================
// VALIDATION SCHEMAS
// ============================================
const nonceQuerySchema = zod_1.z.object({
    address: zod_1.z.string().min(1, 'Address is required'),
    chainType: zod_1.z.enum(['EVM', 'SOLANA']),
    chainId: zod_1.z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
});
const siweVerifySchema = zod_1.z.object({
    message: zod_1.z.string().min(1, 'Message is required'),
    signature: zod_1.z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature format'),
});
const siwsVerifySchema = zod_1.z.object({
    message: zod_1.z.string().min(1, 'Message is required'),
    signature: zod_1.z.string().min(1, 'Signature is required'),
    publicKey: zod_1.z.string().min(32, 'Invalid public key'),
});
const linkWalletSchema = zod_1.z.object({
    message: zod_1.z.string().min(1, 'Message is required'),
    signature: zod_1.z.string().min(1, 'Signature is required'),
    publicKey: zod_1.z.string().optional(), // Required for Solana
    chainType: zod_1.z.enum(['EVM', 'SOLANA']),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
// ============================================
// NONCE GENERATION
// ============================================
/**
 * GET /api/auth/wallet/nonce
 *
 * Generate a nonce and signing message for wallet authentication.
 *
 * Query params:
 * - address: Wallet address (hex for EVM, base58 for Solana)
 * - chainType: 'EVM' or 'SOLANA'
 * - chainId: (optional) EVM chain ID
 *
 * Response:
 * - nonce: The nonce to include in the message
 * - message: The message to sign
 * - expiresAt: When the nonce expires
 */
router.get('/nonce', async (req, res) => {
    try {
        const parsed = nonceQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request parameters',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }
        const { address, chainType, chainId } = parsed.data;
        // Validate address format
        if (chainType === 'EVM') {
            if (!(0, siwe_service_1.isValidEthAddress)(address)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ADDRESS',
                        message: 'Invalid Ethereum address format',
                    },
                });
            }
            // Validate chain ID if provided
            if (chainId !== undefined && !(0, siwe_service_1.isSupportedChain)(chainId)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'UNSUPPORTED_CHAIN',
                        message: `Chain ID ${chainId} is not supported`,
                        supportedChains: Object.keys(siwe_service_1.SUPPORTED_CHAINS).map(Number),
                    },
                });
            }
        }
        else if (chainType === 'SOLANA') {
            if (!(0, siws_service_1.isValidSolanaAddress)(address)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ADDRESS',
                        message: 'Invalid Solana address format',
                    },
                });
            }
        }
        // Generate nonce
        const { nonce, expiresAt } = await (0, nonce_service_1.createNonce)(chainType);
        // Create signing message
        let message;
        if (chainType === 'EVM') {
            message = (0, siwe_service_1.createSiweMessage)({
                address,
                nonce,
                chainId: chainId || 1, // Default to Ethereum mainnet
            });
        }
        else {
            message = (0, siws_service_1.createSiwsMessage)({
                publicKey: address,
                nonce,
            });
        }
        logger.debug({
            address: address.substring(0, 10) + '...',
            chainType,
            chainId,
        }, 'Nonce generated');
        res.json({
            success: true,
            nonce,
            message,
            expiresAt: expiresAt.toISOString(),
        });
    }
    catch (error) {
        logger.error({ error }, 'Nonce generation failed');
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to generate nonce',
            },
        });
    }
});
// ============================================
// SIWE VERIFICATION (Ethereum)
// ============================================
/**
 * POST /api/auth/wallet/verify/siwe
 *
 * Verify SIWE signature and authenticate user.
 *
 * Body:
 * - message: The signed SIWE message
 * - signature: The wallet signature (0x prefixed hex)
 *
 * Response:
 * - user: User profile
 * - accessToken: JWT access token
 * - refreshToken: JWT refresh token
 * - expiresIn: Token expiration in seconds
 */
router.post('/verify/siwe', async (req, res) => {
    try {
        const parsed = siweVerifySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }
        const { message, signature } = parsed.data;
        // Verify signature
        const result = await (0, siwe_service_1.verifySiweMessage)(message, signature);
        if (!result.success || !result.address) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'VERIFICATION_FAILED',
                    message: result.error || 'Signature verification failed',
                },
            });
        }
        // Find or create user
        const { user, isNew } = await (0, auth_service_1.findOrCreateUserByWallet)(result.address, 'EVM', result.chainId);
        // Check if user is banned
        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'User account is suspended',
                },
            });
        }
        // Generate tokens
        const tokens = (0, auth_service_1.generateTokens)({
            userId: user.id,
            fid: user.fid || undefined,
            walletAddress: result.address,
            chainType: 'EVM',
            chainId: result.chainId,
            authSource: 'siwe',
        });
        logger.info({
            userId: user.id,
            address: result.address.substring(0, 10) + '...',
            chainId: result.chainId,
            isNew,
        }, 'SIWE authentication successful');
        res.json({
            success: true,
            user,
            isNew,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            expiresAt: tokens.expiresAt.toISOString(),
        });
    }
    catch (error) {
        logger.error({ error }, 'SIWE verification failed');
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Authentication failed',
            },
        });
    }
});
// ============================================
// SIWS VERIFICATION (Solana)
// ============================================
/**
 * POST /api/auth/wallet/verify/siws
 *
 * Verify SIWS signature and authenticate user.
 *
 * Body:
 * - message: The signed SIWS message
 * - signature: The wallet signature (base58 or hex)
 * - publicKey: The Solana public key (base58)
 *
 * Response:
 * - user: User profile
 * - accessToken: JWT access token
 * - refreshToken: JWT refresh token
 * - expiresIn: Token expiration in seconds
 */
router.post('/verify/siws', async (req, res) => {
    try {
        const parsed = siwsVerifySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }
        const { message, signature, publicKey } = parsed.data;
        // Validate public key format
        if (!(0, siws_service_1.isValidSolanaAddress)(publicKey)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ADDRESS',
                    message: 'Invalid Solana public key format',
                },
            });
        }
        // Verify signature
        const result = await (0, siws_service_1.verifySiwsMessage)(message, signature, publicKey);
        if (!result.success || !result.address) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'VERIFICATION_FAILED',
                    message: result.error || 'Signature verification failed',
                },
            });
        }
        // Find or create user
        const { user, isNew } = await (0, auth_service_1.findOrCreateUserByWallet)(result.address, 'SOLANA');
        // Check if user is banned
        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'User account is suspended',
                },
            });
        }
        // Generate tokens
        const tokens = (0, auth_service_1.generateTokens)({
            userId: user.id,
            fid: user.fid || undefined,
            walletAddress: result.address,
            chainType: 'SOLANA',
            authSource: 'siws',
        });
        logger.info({
            userId: user.id,
            address: result.address.substring(0, 10) + '...',
            isNew,
        }, 'SIWS authentication successful');
        res.json({
            success: true,
            user,
            isNew,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            expiresAt: tokens.expiresAt.toISOString(),
        });
    }
    catch (error) {
        logger.error({ error }, 'SIWS verification failed');
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Authentication failed',
            },
        });
    }
});
// ============================================
// WALLET LINKING
// ============================================
/**
 * POST /api/auth/wallet/link
 *
 * Link a wallet to an existing authenticated account.
 * Requires prior authentication (Farcaster or other wallet).
 *
 * Body:
 * - message: The signed message
 * - signature: The wallet signature
 * - publicKey: (Solana only) The public key
 * - chainType: 'EVM' or 'SOLANA'
 */
router.post('/link', auth_1.verifyAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
        }
        const parsed = linkWalletSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }
        const { message, signature, publicKey, chainType } = parsed.data;
        let address;
        let chainId;
        // Verify signature based on chain type
        if (chainType === 'EVM') {
            const result = await (0, siwe_service_1.verifySiweMessage)(message, signature);
            if (!result.success || !result.address) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'VERIFICATION_FAILED',
                        message: result.error || 'Signature verification failed',
                    },
                });
            }
            address = result.address;
            chainId = result.chainId;
        }
        else {
            if (!publicKey) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Public key is required for Solana',
                    },
                });
            }
            const result = await (0, siws_service_1.verifySiwsMessage)(message, signature, publicKey);
            if (!result.success || !result.address) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'VERIFICATION_FAILED',
                        message: result.error || 'Signature verification failed',
                    },
                });
            }
            address = result.address;
        }
        // Link wallet to user
        const linkResult = await (0, auth_service_1.linkWalletToUser)(authReq.user.id, address, chainType, chainId);
        if (!linkResult.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'LINK_FAILED',
                    message: linkResult.error || 'Failed to link wallet',
                },
            });
        }
        logger.info({
            userId: authReq.user.id,
            address: address.substring(0, 10) + '...',
            chainType,
        }, 'Wallet linked successfully');
        res.json({
            success: true,
            message: 'Wallet linked successfully',
            wallet: {
                address,
                chainType,
                chainId,
            },
        });
    }
    catch (error) {
        logger.error({ error }, 'Wallet linking failed');
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to link wallet',
            },
        });
    }
});
// ============================================
// TOKEN REFRESH
// ============================================
/**
 * POST /api/auth/wallet/refresh
 *
 * Refresh access token using refresh token.
 *
 * Body:
 * - refreshToken: The refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const parsed = refreshSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }
        const { refreshToken } = parsed.data;
        const tokens = await (0, auth_service_1.refreshAccessToken)(refreshToken);
        if (!tokens) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired refresh token',
                },
            });
        }
        res.json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            expiresAt: tokens.expiresAt.toISOString(),
        });
    }
    catch (error) {
        logger.error({ error }, 'Token refresh failed');
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to refresh token',
            },
        });
    }
});
// ============================================
// WALLET MANAGEMENT
// ============================================
/**
 * GET /api/auth/wallet/wallets
 *
 * List all wallets connected to the authenticated user.
 */
router.get('/wallets', auth_1.verifyAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
        }
        const wallets = await index_1.prisma.cryptoWallet.findMany({
            where: { userId: authReq.user.id },
            select: {
                id: true,
                address: true,
                chainType: true,
                chainId: true,
                isPrimary: true,
                label: true,
                verifiedAt: true,
                lastUsedAt: true,
            },
            orderBy: [
                { isPrimary: 'desc' },
                { lastUsedAt: 'desc' },
            ],
        });
        res.json({
            success: true,
            wallets,
        });
    }
    catch (error) {
        logger.error({ error }, 'Failed to fetch wallets');
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch wallets',
            },
        });
    }
});
/**
 * DELETE /api/auth/wallet/wallets/:id
 *
 * Unlink a wallet from the authenticated user.
 * Cannot unlink primary wallet if it's the only auth method.
 */
router.delete('/wallets/:id', auth_1.verifyAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
        }
        const { id } = req.params;
        // Find the wallet
        const wallet = await index_1.prisma.cryptoWallet.findUnique({
            where: { id },
            include: { user: { select: { fid: true } } },
        });
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Wallet not found',
                },
            });
        }
        if (wallet.userId !== authReq.user.id) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You can only unlink your own wallets',
                },
            });
        }
        // Check if this is the only auth method
        const otherWallets = await index_1.prisma.cryptoWallet.count({
            where: { userId: authReq.user.id, id: { not: id } },
        });
        if (!wallet.user.fid && otherWallets === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'LAST_AUTH_METHOD',
                    message: 'Cannot unlink your only authentication method',
                },
            });
        }
        // Delete wallet and associated account
        await index_1.prisma.$transaction([
            index_1.prisma.cryptoWallet.delete({ where: { id } }),
            index_1.prisma.account.deleteMany({
                where: {
                    userId: authReq.user.id,
                    walletAddress: wallet.address,
                },
            }),
        ]);
        logger.info({
            userId: authReq.user.id,
            walletId: id,
            address: wallet.address.substring(0, 10) + '...',
        }, 'Wallet unlinked');
        res.json({
            success: true,
            message: 'Wallet unlinked successfully',
        });
    }
    catch (error) {
        logger.error({ error }, 'Failed to unlink wallet');
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to unlink wallet',
            },
        });
    }
});
// ============================================
// SUPPORTED CHAINS INFO
// ============================================
/**
 * GET /api/auth/wallet/chains
 *
 * Get list of supported chains.
 */
router.get('/chains', (_req, res) => {
    const chains = Object.entries(siwe_service_1.SUPPORTED_CHAINS).map(([id, info]) => ({
        chainId: parseInt(id),
        name: info.name,
        type: 'EVM',
    }));
    // Add Solana
    chains.push({
        chainId: 0, // Solana doesn't use chain IDs like EVM
        name: 'Solana',
        type: 'SOLANA',
    });
    res.json({
        success: true,
        chains,
    });
});
exports.default = router;
//# sourceMappingURL=wallet-auth.js.map