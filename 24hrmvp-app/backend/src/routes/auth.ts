/**
 * Unified Authentication Routes
 * Replaces: auth.ts and wallet-auth.ts
 *
 * Implements:
 * - Farcaster Quick Auth (Mini App context)
 * - SIWE (Ethereum Wallet context)
 * - Unified Session Management
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod'; // Ensure zod is installed: npm install zod
import { prisma } from '../index';
import { verifyAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { createNonce } from '../services/nonce.service';
import {
  createSiweMessage,
  verifySiweMessage,
  isValidEthAddress,
} from '../services/siwe.service';
import { findOrCreateUserByWallet, generateTokens } from '../services/auth.service';

const router = Router();
const logger = console; // Replace with your actual logger import

// --- Validation Schemas ---
const siweNonceSchema = z.object({
  address: z.string().min(1),
  chainId: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
});

const siweVerifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  address: z.string().min(1),
});

/**
 * GET /api/auth/providers
 * Returns available auth methods for the frontend UI
 */
router.get('/providers', (_req: Request, res: Response) => {
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
router.post('/siwe/nonce', async (req: Request, res: Response) => {
  try {
    const { address, chainId } = siweNonceSchema.parse(req.body);

    if (!isValidEthAddress(address)) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }

    const { nonce, expiresAt } = await createNonce('EVM');
    const message = createSiweMessage({ address, nonce, chainId: chainId || 1 });

    res.json({ success: true, nonce, message, expiresAt });
  } catch (error) {
    logger.error({ error }, 'Nonce generation failed');
    res.status(400).json({ success: false, error: 'Invalid request' });
  }
});

/**
 * POST /api/auth/siwe/verify
 * Verifies SIWE signature and returns user + tokens
 * NOTE: Does NOT set cookies. Next.js API Route (BFF) should handle cookie setting.
 */
router.post('/siwe/verify', async (req: Request, res: Response) => {
  try {
    const { message, signature, address } = siweVerifySchema.parse(req.body);

    // 1. Verify Signature
    const result = await verifySiweMessage(message, signature as `0x${string}`);
    if (!result.success || !result.address) {
      return res.status(401).json({
        success: false,
        error: { code: 'VERIFICATION_FAILED', message: result.error }
      });
    }

    // 2. Find/Create User
    const { user, isNew } = await findOrCreateUserByWallet(result.address, 'EVM', result.chainId);

    if (user.isBanned) {
      return res.status(403).json({ success: false, error: 'User banned' });
    }

    // 3. Generate Token (JWT)
    const tokens = generateTokens({
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

  } catch (error) {
    logger.error({ error }, 'SIWE verify error');
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

/**
 * POST /api/auth/verify
 * Unified verification for Farcaster/Custom tokens
 */
router.post('/verify', verifyAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id, fid, username, displayName, pfpUrl, authSource } = authReq.user;

    // Upsert logic for Farcaster/Other providers
    const user = await prisma.user.upsert({
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
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verify failed' });
  }
});

/**
 * GET /api/auth/me
 * Returns full profile for the authenticated session
 */
router.get('/me', verifyAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    return res.status(401).json({ success: false });
  }

  const user = await prisma.user.findUnique({
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
router.post('/logout', optionalAuth, (req: Request, res: Response) => {
  // Logic to invalidate refresh tokens in DB if applicable
  res.json({ success: true, message: 'Logged out' });
});

/**
 * GET /api/auth/session
 * Compatibility alias for /me to support existing frontend calls
 */
router.get('/session', verifyAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    return res.status(401).json({ success: false, error: 'No active session' });
  }

  // Safe property access using fallback for compatibility
  const walletAddr = (authReq.user as any).primaryWalletAddress || (authReq.user as any).walletAddress || null;

  res.json({
    success: true,
    user: {
      ...authReq.user,
      walletAddress: walletAddr
    }
  });
});

export default router;
