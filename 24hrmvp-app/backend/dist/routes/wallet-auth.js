"use strict";
/**
 * Wallet Authentication Routes
 *
 * Endpoints for SIWE (Ethereum) and SIWS (Solana) wallet authentication.
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
    publicKey: zod_1.z.string().optional(),
    chainType: zod_1.z.enum(['EVM', 'SOLANA']),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
// ============================================
// NONCE GENERATION
// ============================================
router.get('/nonce', async (req, res) => {
    try {
        const parsed = nonceQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request parameters',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
            return;
        }
        const { address, chainType, chainId } = parsed.data;
        // Validate address format
        if (chainType === 'EVM') {
            if (!(0, siwe_service_1.isValidEthAddress)(address)) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ADDRESS',
                        message: 'Invalid Ethereum address format',
                    },
                });
                return;
            }
            if (chainId !== undefined && !(0, siwe_service_1.isSupportedChain)(chainId)) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'UNSUPPORTED_CHAIN',
                        message: `Chain ID ${chainId} is not supported`,
                        supportedChains: Object.keys(siwe_service_1.SUPPORTED_CHAINS).map(Number),
                    },
                });
                return;
            }
        }
        else if (chainType === 'SOLANA') {
            if (!(0, siws_service_1.isValidSolanaAddress)(address)) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ADDRESS',
                        message: 'Invalid Solana address format',
                    },
                });
                return;
            }
        }
        // Generate nonce - convert string to ChainType enum
        const chainTypeEnum = chainType;
        const { nonce, expiresAt } = await (0, nonce_service_1.createNonce)(chainTypeEnum);
        // Create signing message
        let message;
        if (chainType === 'EVM') {
            message = (0, siwe_service_1.createSiweMessage)({
                address,
                nonce,
                chainId: chainId || 1,
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
router.post('/verify/siwe', async (req, res) => {
    try {
        const parsed = siweVerifySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
            return;
        }
        const { message, signature } = parsed.data;
        const result = await (0, siwe_service_1.verifySiweMessage)(message, signature);
        if (!result.success || !result.address) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'VERIFICATION_FAILED',
                    message: result.error || 'Signature verification failed',
                },
            });
            return;
        }
        const { user, isNew } = await (0, auth_service_1.findOrCreateUserByWallet)(result.address, 'EVM', result.chainId);
        if (user.isBanned) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'User account is suspended',
                },
            });
            return;
        }
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
router.post('/verify/siws', async (req, res) => {
    try {
        const parsed = siwsVerifySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
            return;
        }
        const { message, signature, publicKey } = parsed.data;
        if (!(0, siws_service_1.isValidSolanaAddress)(publicKey)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ADDRESS',
                    message: 'Invalid Solana public key format',
                },
            });
            return;
        }
        const result = await (0, siws_service_1.verifySiwsMessage)(message, signature, publicKey);
        if (!result.success || !result.address) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'VERIFICATION_FAILED',
                    message: result.error || 'Signature verification failed',
                },
            });
            return;
        }
        const { user, isNew } = await (0, auth_service_1.findOrCreateUserByWallet)(result.address, 'SOLANA');
        if (user.isBanned) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'User account is suspended',
                },
            });
            return;
        }
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
router.post('/link', auth_1.verifyAuth, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const parsed = linkWalletSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
            return;
        }
        const { message, signature, publicKey, chainType } = parsed.data;
        let address;
        let chainId;
        if (chainType === 'EVM') {
            const result = await (0, siwe_service_1.verifySiweMessage)(message, signature);
            if (!result.success || !result.address) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'VERIFICATION_FAILED',
                        message: result.error || 'Signature verification failed',
                    },
                });
                return;
            }
            address = result.address;
            chainId = result.chainId;
        }
        else {
            if (!publicKey) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Public key is required for Solana',
                    },
                });
                return;
            }
            const result = await (0, siws_service_1.verifySiwsMessage)(message, signature, publicKey);
            if (!result.success || !result.address) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'VERIFICATION_FAILED',
                        message: result.error || 'Signature verification failed',
                    },
                });
                return;
            }
            address = result.address;
        }
        const linkResult = await (0, auth_service_1.linkWalletToUser)(req.user.id, address, chainType, chainId);
        if (!linkResult.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'LINK_FAILED',
                    message: linkResult.error || 'Failed to link wallet',
                },
            });
            return;
        }
        logger.info({
            userId: req.user.id,
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
router.post('/refresh', async (req, res) => {
    try {
        const parsed = refreshSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
            return;
        }
        const { refreshToken } = parsed.data;
        const tokens = await (0, auth_service_1.refreshAccessToken)(refreshToken);
        if (!tokens) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired refresh token',
                },
            });
            return;
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
router.get('/wallets', auth_1.verifyAuth, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const wallets = await index_1.prisma.cryptoWallet.findMany({
            where: { userId: req.user.id },
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
router.delete('/wallets/:id', auth_1.verifyAuth, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticated)(req)) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }
        const { id } = req.params;
        const wallet = await index_1.prisma.cryptoWallet.findUnique({
            where: { id },
            include: { user: { select: { fid: true } } },
        });
        if (!wallet) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Wallet not found',
                },
            });
            return;
        }
        if (wallet.userId !== req.user.id) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You can only unlink your own wallets',
                },
            });
            return;
        }
        const otherWallets = await index_1.prisma.cryptoWallet.count({
            where: { userId: req.user.id, id: { not: id } },
        });
        if (!wallet.user.fid && otherWallets === 0) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'LAST_AUTH_METHOD',
                    message: 'Cannot unlink your only authentication method',
                },
            });
            return;
        }
        await index_1.prisma.$transaction([
            index_1.prisma.cryptoWallet.delete({ where: { id } }),
            index_1.prisma.account.deleteMany({
                where: {
                    userId: req.user.id,
                    walletAddress: wallet.address,
                },
            }),
        ]);
        logger.info({
            userId: req.user.id,
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
router.get('/chains', (_req, res) => {
    // Build EVM chains list
    const evmChains = Object.entries(siwe_service_1.SUPPORTED_CHAINS).map(([id, info]) => ({
        chainId: parseInt(id),
        name: info.name,
        type: 'EVM',
    }));
    // Build combined list with proper typing
    const allChains = [
        ...evmChains,
        {
            chainId: 0,
            name: 'Solana',
            type: 'SOLANA',
        },
    ];
    res.json({
        success: true,
        chains: allChains,
    });
});
exports.default = router;
//# sourceMappingURL=wallet-auth.js.map