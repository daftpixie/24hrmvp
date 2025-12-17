"use strict";
/**
 * Unified Authentication Service
 *
 * Handles user authentication across multiple providers:
 * - Farcaster Quick Auth (FID-based)
 * - SIWE (Ethereum wallets)
 * - SIWS (Solana wallets)
 *
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokens = generateTokens;
exports.verifyAccessToken = verifyAccessToken;
exports.refreshAccessToken = refreshAccessToken;
exports.findOrCreateUserByFid = findOrCreateUserByFid;
exports.findOrCreateUserByWallet = findOrCreateUserByWallet;
exports.linkWalletToUser = linkWalletToUser;
exports.getUserById = getUserById;
exports.getUserByFid = getUserByFid;
exports.getUserByWallet = getUserByWallet;
exports.authProviderToSource = authProviderToSource;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const index_1 = require("../index");
// Logger (optional)
let logger;
try {
    const loggerModule = require('../lib/logger');
    logger = loggerModule.authLogger || loggerModule.logger || console;
}
catch {
    logger = console;
}
// Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto_1.default.randomBytes(32).toString('hex');
const REFRESH_SECRET = process.env.REFRESH_SECRET || crypto_1.default.randomBytes(32).toString('hex');
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
// Warn if using default secrets in production
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET not set in production!');
    }
    if (!process.env.REFRESH_SECRET) {
        logger.error('REFRESH_SECRET not set in production!');
    }
}
// ============================================
// TOKEN GENERATION
// ============================================
function generateTokens(payload) {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60;
    const expiresAt = new Date((now + expiresIn) * 1000);
    const accessToken = jsonwebtoken_1.default.sign({ ...payload, iat: now }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: payload.userId, authSource: payload.authSource, iat: now }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    return {
        accessToken,
        refreshToken,
        expiresIn,
        expiresAt,
    };
}
function verifyAccessToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return payload;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            logger.debug('Access token expired');
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            logger.warn({ error: error.message }, 'Invalid access token');
        }
        return null;
    }
}
async function refreshAccessToken(refreshToken) {
    try {
        const payload = jsonwebtoken_1.default.verify(refreshToken, REFRESH_SECRET);
        const user = await index_1.prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                accounts: {
                    orderBy: { lastUsedAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!user || user.isBanned) {
            logger.warn({ userId: payload.userId }, 'Refresh token for invalid/banned user');
            return null;
        }
        const recentAccount = user.accounts[0];
        const newPayload = {
            userId: user.id,
            fid: user.fid || undefined,
            walletAddress: recentAccount?.walletAddress || undefined,
            chainType: recentAccount?.chainType || undefined,
            chainId: recentAccount?.chainId || undefined,
            authSource: payload.authSource,
        };
        return generateTokens(newPayload);
    }
    catch (error) {
        logger.debug({ error }, 'Refresh token verification failed');
        return null;
    }
}
// ============================================
// USER MANAGEMENT - FARCASTER
// ============================================
async function findOrCreateUserByFid(fid, profileData) {
    let user = await index_1.prisma.user.findUnique({
        where: { fid },
    });
    const isNew = !user;
    if (!user) {
        const username = profileData?.username || `user-${fid}`;
        user = await index_1.prisma.user.create({
            data: {
                fid,
                username,
                displayName: profileData?.displayName,
                pfpUrl: profileData?.pfpUrl,
                custodyAddress: profileData?.custodyAddress,
                verifications: profileData?.verifications || [],
                primaryAuthProvider: 'FARCASTER',
                accounts: {
                    create: {
                        provider: 'FARCASTER',
                        providerAccountId: fid.toString(),
                        fid,
                    },
                },
            },
        });
        logger.info({ fid, userId: user.id }, 'Created new user via Farcaster');
    }
    else {
        user = await index_1.prisma.user.update({
            where: { fid },
            data: {
                lastSeenAt: new Date(),
                displayName: profileData?.displayName || user.displayName,
                pfpUrl: profileData?.pfpUrl || user.pfpUrl,
                custodyAddress: profileData?.custodyAddress || user.custodyAddress,
                verifications: profileData?.verifications || user.verifications,
            },
        });
        await index_1.prisma.account.upsert({
            where: {
                provider_providerAccountId: {
                    provider: 'FARCASTER',
                    providerAccountId: fid.toString(),
                },
            },
            update: { lastUsedAt: new Date() },
            create: {
                userId: user.id,
                provider: 'FARCASTER',
                providerAccountId: fid.toString(),
                fid,
            },
        });
    }
    return {
        user: mapUserToProfile(user),
        isNew,
    };
}
// ============================================
// USER MANAGEMENT - WALLET
// ============================================
function generateUsernameFromAddress(address, chainType) {
    const prefix = chainType === 'SOLANA' ? 'sol' : 'eth';
    const shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
    return `${prefix}-${shortAddr}`.toLowerCase();
}
async function findOrCreateUserByWallet(address, chainType, chainId) {
    const normalizedAddress = chainType === 'EVM' ? address.toLowerCase() : address;
    const provider = chainType === 'EVM' ? 'SIWE' : 'SIWS';
    const existingAccount = await index_1.prisma.account.findUnique({
        where: {
            provider_providerAccountId: {
                provider,
                providerAccountId: normalizedAddress,
            },
        },
        include: { user: true },
    });
    if (existingAccount) {
        await index_1.prisma.account.update({
            where: { id: existingAccount.id },
            data: { lastUsedAt: new Date() },
        });
        await index_1.prisma.user.update({
            where: { id: existingAccount.user.id },
            data: { lastSeenAt: new Date() },
        });
        logger.debug({ address: normalizedAddress, userId: existingAccount.user.id }, 'User found by wallet');
        return {
            user: mapUserToProfile(existingAccount.user),
            isNew: false,
        };
    }
    const existingWallet = await index_1.prisma.cryptoWallet.findUnique({
        where: { address: normalizedAddress },
        include: { user: true },
    });
    if (existingWallet) {
        await index_1.prisma.account.create({
            data: {
                userId: existingWallet.user.id,
                provider,
                providerAccountId: normalizedAddress,
                walletAddress: normalizedAddress,
                chainType,
                chainId,
            },
        });
        logger.info({
            address: normalizedAddress,
            userId: existingWallet.user.id
        }, 'Created account link for existing wallet');
        return {
            user: mapUserToProfile(existingWallet.user),
            isNew: false,
        };
    }
    const username = generateUsernameFromAddress(normalizedAddress, chainType);
    let finalUsername = username;
    let counter = 1;
    while (await index_1.prisma.user.findUnique({ where: { username: finalUsername } })) {
        finalUsername = `${username}-${counter}`;
        counter++;
    }
    const user = await index_1.prisma.user.create({
        data: {
            username: finalUsername,
            primaryAuthProvider: provider,
            primaryWalletAddress: normalizedAddress,
            accounts: {
                create: {
                    provider,
                    providerAccountId: normalizedAddress,
                    walletAddress: normalizedAddress,
                    chainType,
                    chainId,
                },
            },
            cryptoWallets: {
                create: {
                    address: normalizedAddress,
                    chainType,
                    chainId,
                    isPrimary: true,
                },
            },
        },
    });
    logger.info({
        address: normalizedAddress,
        userId: user.id,
        chainType,
        chainId,
    }, 'Created new user via wallet');
    return {
        user: mapUserToProfile(user),
        isNew: true,
    };
}
// ============================================
// WALLET LINKING
// ============================================
async function linkWalletToUser(userId, address, chainType, chainId) {
    const normalizedAddress = chainType === 'EVM' ? address.toLowerCase() : address;
    const provider = chainType === 'EVM' ? 'SIWE' : 'SIWS';
    const existingWallet = await index_1.prisma.cryptoWallet.findUnique({
        where: { address: normalizedAddress },
    });
    if (existingWallet && existingWallet.userId !== userId) {
        logger.warn({
            address: normalizedAddress,
            existingUserId: existingWallet.userId,
            requestingUserId: userId,
        }, 'Wallet already owned by another user');
        return { success: false, error: 'Wallet is already linked to another account' };
    }
    const existingAccount = await index_1.prisma.account.findUnique({
        where: {
            provider_providerAccountId: {
                provider,
                providerAccountId: normalizedAddress,
            },
        },
    });
    if (existingAccount && existingAccount.userId !== userId) {
        return { success: false, error: 'Wallet is already linked to another account' };
    }
    const user = await index_1.prisma.user.findUnique({
        where: { id: userId },
        include: { cryptoWallets: true },
    });
    if (!user) {
        return { success: false, error: 'User not found' };
    }
    await index_1.prisma.$transaction([
        index_1.prisma.account.upsert({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId: normalizedAddress,
                },
            },
            update: {
                lastUsedAt: new Date(),
                chainId,
            },
            create: {
                userId,
                provider,
                providerAccountId: normalizedAddress,
                walletAddress: normalizedAddress,
                chainType,
                chainId,
            },
        }),
        index_1.prisma.cryptoWallet.upsert({
            where: { address: normalizedAddress },
            update: {
                lastUsedAt: new Date(),
                chainId,
            },
            create: {
                userId,
                address: normalizedAddress,
                chainType,
                chainId,
                isPrimary: user.cryptoWallets.length === 0,
            },
        }),
        ...(user.cryptoWallets.length === 0 ? [
            index_1.prisma.user.update({
                where: { id: userId },
                data: { primaryWalletAddress: normalizedAddress },
            }),
        ] : []),
    ]);
    logger.info({
        userId,
        address: normalizedAddress,
        chainType,
    }, 'Wallet linked to user');
    return { success: true };
}
// ============================================
// USER LOOKUP
// ============================================
async function getUserById(userId) {
    const user = await index_1.prisma.user.findUnique({
        where: { id: userId },
    });
    return user ? mapUserToProfile(user) : null;
}
async function getUserByFid(fid) {
    const user = await index_1.prisma.user.findUnique({
        where: { fid },
    });
    return user ? mapUserToProfile(user) : null;
}
async function getUserByWallet(address) {
    const normalizedAddress = address.toLowerCase();
    const wallet = await index_1.prisma.cryptoWallet.findFirst({
        where: {
            OR: [
                { address: normalizedAddress },
                { address },
            ],
        },
        include: { user: true },
    });
    if (wallet) {
        return mapUserToProfile(wallet.user);
    }
    const account = await index_1.prisma.account.findFirst({
        where: {
            OR: [
                { walletAddress: normalizedAddress },
                { walletAddress: address },
            ],
        },
        include: { user: true },
    });
    return account ? mapUserToProfile(account.user) : null;
}
// ============================================
// HELPERS
// ============================================
function mapUserToProfile(user) {
    return {
        id: user.id,
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        pfpUrl: user.pfpUrl,
        primaryAuthProvider: user.primaryAuthProvider,
        primaryWalletAddress: user.primaryWalletAddress,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        membershipTier: user.membershipTier,
        points: user.points,
        level: user.level,
    };
}
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
exports.default = {
    generateTokens,
    verifyAccessToken,
    refreshAccessToken,
    findOrCreateUserByFid,
    findOrCreateUserByWallet,
    linkWalletToUser,
    getUserById,
    getUserByFid,
    getUserByWallet,
    authProviderToSource,
};
//# sourceMappingURL=auth.service.js.map