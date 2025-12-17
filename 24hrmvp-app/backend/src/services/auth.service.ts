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

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../index';
import { AuthProvider, ChainType, User } from '@prisma/client';

// Logger (optional)
let logger: any;
try {
  const loggerModule = require('../lib/logger');
  logger = loggerModule.authLogger || loggerModule.logger || console;
} catch {
  logger = console;
}

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const REFRESH_SECRET = process.env.REFRESH_SECRET || crypto.randomBytes(32).toString('hex');
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
// TYPES
// ============================================

export type AuthSource = 'farcaster' | 'siwe' | 'siws';

export interface TokenPayload {
  userId: string;
  fid?: number;
  walletAddress?: string;
  chainType?: ChainType;
  chainId?: number;
  authSource: AuthSource;
  iat?: number;
  exp?: number;
}

export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: Date;
}

export interface UserProfile {
  id: string;
  fid: number | null;
  username: string;
  displayName: string | null;
  pfpUrl: string | null;
  primaryAuthProvider: AuthProvider;
  primaryWalletAddress: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  membershipTier: string;
  points: number;
  level: number;
}

export interface CreateUserOptions {
  fid?: number;
  walletAddress?: string;
  chainType?: ChainType;
  chainId?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

// ============================================
// TOKEN GENERATION
// ============================================

export function generateTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>): GeneratedTokens {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 15 * 60;
  const expiresAt = new Date((now + expiresIn) * 1000);

  const accessToken = jwt.sign(
    { ...payload, iat: now },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId: payload.userId, authSource: payload.authSource, iat: now },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn,
    expiresAt,
  };
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn({ error: (error as Error).message }, 'Invalid access token');
    }
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<GeneratedTokens | null> {
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string; authSource: AuthSource };
    
    const user = await prisma.user.findUnique({
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

    const newPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      fid: user.fid || undefined,
      walletAddress: recentAccount?.walletAddress || undefined,
      chainType: recentAccount?.chainType || undefined,
      chainId: recentAccount?.chainId || undefined,
      authSource: payload.authSource,
    };

    return generateTokens(newPayload);
  } catch (error) {
    logger.debug({ error }, 'Refresh token verification failed');
    return null;
  }
}

// ============================================
// USER MANAGEMENT - FARCASTER
// ============================================

export async function findOrCreateUserByFid(
  fid: number,
  profileData?: {
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    custodyAddress?: string;
    verifications?: string[];
  }
): Promise<{ user: UserProfile; isNew: boolean }> {
  let user = await prisma.user.findUnique({
    where: { fid },
  });

  const isNew = !user;

  if (!user) {
    const username = profileData?.username || `user-${fid}`;
    
    user = await prisma.user.create({
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
  } else {
    user = await prisma.user.update({
      where: { fid },
      data: {
        lastSeenAt: new Date(),
        displayName: profileData?.displayName || user.displayName,
        pfpUrl: profileData?.pfpUrl || user.pfpUrl,
        custodyAddress: profileData?.custodyAddress || user.custodyAddress,
        verifications: profileData?.verifications || user.verifications,
      },
    });

    await prisma.account.upsert({
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

function generateUsernameFromAddress(address: string, chainType: ChainType): string {
  const prefix = chainType === 'SOLANA' ? 'sol' : 'eth';
  const shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
  return `${prefix}-${shortAddr}`.toLowerCase();
}

export async function findOrCreateUserByWallet(
  address: string,
  chainType: ChainType,
  chainId?: number
): Promise<{ user: UserProfile; isNew: boolean }> {
  const normalizedAddress = chainType === 'EVM' ? address.toLowerCase() : address;
  const provider: AuthProvider = chainType === 'EVM' ? 'SIWE' : 'SIWS';

  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: normalizedAddress,
      },
    },
    include: { user: true },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { lastUsedAt: new Date() },
    });

    await prisma.user.update({
      where: { id: existingAccount.user.id },
      data: { lastSeenAt: new Date() },
    });

    logger.debug({ address: normalizedAddress, userId: existingAccount.user.id }, 'User found by wallet');

    return {
      user: mapUserToProfile(existingAccount.user),
      isNew: false,
    };
  }

  const existingWallet = await prisma.cryptoWallet.findUnique({
    where: { address: normalizedAddress },
    include: { user: true },
  });

  if (existingWallet) {
    await prisma.account.create({
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
  while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
    finalUsername = `${username}-${counter}`;
    counter++;
  }

  const user = await prisma.user.create({
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

export async function linkWalletToUser(
  userId: string,
  address: string,
  chainType: ChainType,
  chainId?: number
): Promise<{ success: boolean; error?: string }> {
  const normalizedAddress = chainType === 'EVM' ? address.toLowerCase() : address;
  const provider: AuthProvider = chainType === 'EVM' ? 'SIWE' : 'SIWS';

  const existingWallet = await prisma.cryptoWallet.findUnique({
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

  const existingAccount = await prisma.account.findUnique({
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { cryptoWallets: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  await prisma.$transaction([
    prisma.account.upsert({
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

    prisma.cryptoWallet.upsert({
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
      prisma.user.update({
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

export async function getUserById(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  return user ? mapUserToProfile(user) : null;
}

export async function getUserByFid(fid: number): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { fid },
  });

  return user ? mapUserToProfile(user) : null;
}

export async function getUserByWallet(address: string): Promise<UserProfile | null> {
  const normalizedAddress = address.toLowerCase();

  const wallet = await prisma.cryptoWallet.findFirst({
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

  const account = await prisma.account.findFirst({
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

function mapUserToProfile(user: User): UserProfile {
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

export function authProviderToSource(provider: AuthProvider): AuthSource {
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

export default {
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
