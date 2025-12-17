/**
 * Wallet Authentication Routes - SIWE Only
 * 
 * Endpoints for Sign-In with Ethereum (SIWE) wallet authentication.
 * Supports Ethereum, Base, Polygon, Arbitrum, and Optimism chains.
 * 
 * @version 2.0.0 - SIWE Only (Solana removed)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { verifyAuth, isAuthenticated } from '../middleware/auth';
import { createNonce } from '../services/nonce.service';
import { ChainType } from '@prisma/client';
import {
  createSiweMessage,
  verifySiweMessage,
  isValidEthAddress,
  isSupportedChain,
  SUPPORTED_CHAINS,
} from '../services/siwe.service';
import {
  generateTokens,
  refreshAccessToken,
  findOrCreateUserByWallet,
  linkWalletToUser,
} from '../services/auth.service';

// Logger (optional)
let logger: any;
try {
  const loggerModule = require('../lib/logger');
  logger = loggerModule.authLogger || loggerModule.logger || console;
} catch {
  logger = console;
}

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const nonceQuerySchema = z.object({
  address: z.string().min(1, 'Address is required').regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chainId: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
});

const siweVerifySchema = z.object({
  message: z.string().min(1, 'Message is required'),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature format'),
});

const linkWalletSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature format'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================
// NONCE GENERATION
// ============================================

router.get('/nonce', async (req: Request, res: Response) => {
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

    const { address, chainId } = parsed.data;

    // Validate address format
    if (!isValidEthAddress(address)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid Ethereum address format',
        },
      });
      return;
    }

    // Validate chain ID
    if (chainId !== undefined && !isSupportedChain(chainId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_CHAIN',
          message: `Chain ID ${chainId} is not supported`,
          supportedChains: Object.keys(SUPPORTED_CHAINS).map(Number),
        },
      });
      return;
    }

    // Generate nonce with EVM chain type
    const { nonce, expiresAt } = await createNonce(ChainType.EVM);

    // Create SIWE signing message
    const message = createSiweMessage({
      address,
      nonce,
      chainId: chainId || 1,
    });

    logger.debug({
      address: address.substring(0, 10) + '...',
      chainId,
    }, 'Nonce generated');

    res.json({
      success: true,
      nonce,
      message,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
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
// SIWE VERIFICATION
// ============================================

router.post('/verify/siwe', async (req: Request, res: Response) => {
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

    const result = await verifySiweMessage(message, signature as `0x${string}`);
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

    const { user, isNew } = await findOrCreateUserByWallet(
      result.address,
      'EVM',
      result.chainId
    );

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

    const tokens = generateTokens({
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
  } catch (error) {
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
// WALLET LINKING (Add wallet to existing account)
// ============================================

router.post('/link', verifyAuth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
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

    const { message, signature } = parsed.data;

    const result = await verifySiweMessage(message, signature as `0x${string}`);
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

    const linkResult = await linkWalletToUser(
      req.user.id,
      result.address,
      'EVM',
      result.chainId
    );

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
      address: result.address.substring(0, 10) + '...',
      chainId: result.chainId,
    }, 'Wallet linked successfully');

    res.json({
      success: true,
      message: 'Wallet linked successfully',
      wallet: {
        address: result.address,
        chainId: result.chainId,
      },
    });
  } catch (error) {
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

router.post('/refresh', async (req: Request, res: Response) => {
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

    const tokens = await refreshAccessToken(refreshToken);
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
  } catch (error) {
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

router.get('/wallets', verifyAuth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const wallets = await prisma.cryptoWallet.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        address: true,
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
  } catch (error) {
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

router.delete('/wallets/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
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

    const wallet = await prisma.cryptoWallet.findUnique({
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

    const otherWallets = await prisma.cryptoWallet.count({
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

    await prisma.$transaction([
      prisma.cryptoWallet.delete({ where: { id } }),
      prisma.account.deleteMany({
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
  } catch (error) {
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

router.get('/chains', (_req: Request, res: Response) => {
  const chains = Object.entries(SUPPORTED_CHAINS).map(([id, info]) => ({
    chainId: parseInt(id),
    name: info.name,
  }));

  res.json({
    success: true,
    chains,
  });
});

export default router;
