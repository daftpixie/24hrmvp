/**
 * Nonce Service for SIWE Authentication
 * 
 * Generates and validates single-use nonces for Ethereum wallet authentication.
 * Uses Redis for production with Prisma fallback.
 * 
 * @version 2.1.0 - SIWE Only (with Prisma chainType compatibility)
 */

import crypto from 'crypto';
import { prisma } from '../index';

// Optional Redis import with fallback
let redis: any = null;
try {
  const Redis = require('ioredis');
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });
    redis.on('error', (err: Error) => {
      console.warn('Redis connection error, falling back to Prisma:', err.message);
      redis = null;
    });
  }
} catch {
  console.info('Redis not available, using Prisma for nonce storage');
}

// Nonce configuration
const NONCE_TTL_SECONDS = 300; // 5 minutes
const NONCE_LENGTH = 32; // 16 bytes = 32 hex characters
const REDIS_PREFIX = 'auth:nonce:';

// Logger (optional)
let logger: any;
try {
  const loggerModule = require('../lib/logger');
  logger = loggerModule.authLogger || loggerModule.logger || console;
} catch {
  logger = console;
}

export interface NonceData {
  nonce: string;
  sessionId?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateNonceResult {
  nonce: string;
  expiresAt: Date;
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create and store a new nonce
 */
export async function createNonce(sessionId?: string): Promise<CreateNonceResult> {
  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_SECONDS * 1000);

  // Try Redis first
  if (redis) {
    try {
      const data: NonceData = {
        nonce,
        sessionId,
        expiresAt,
        createdAt: new Date(),
      };
      
      await redis.setex(
        `${REDIS_PREFIX}${nonce}`,
        NONCE_TTL_SECONDS,
        JSON.stringify(data)
      );
      
      logger.debug({ nonce: nonce.substring(0, 8) + '...' }, 'Nonce created (Redis)');
      
      return { nonce, expiresAt };
    } catch (error) {
      logger.warn({ error }, 'Redis nonce creation failed, falling back to Prisma');
    }
  }

  // Fallback to Prisma
  // Note: chainType is required by existing schema, defaulting to 'EVM' for SIWE
  await prisma.authNonce.create({
    data: {
      nonce,
      chainType: 'EVM',  // Required by Prisma schema - always EVM for SIWE
      sessionId,
      expiresAt,
    },
  });

  logger.debug({ nonce: nonce.substring(0, 8) + '...' }, 'Nonce created (Prisma)');

  return { nonce, expiresAt };
}

/**
 * Consume a nonce (single-use, atomic operation)
 */
export async function consumeNonce(nonce: string): Promise<NonceData | null> {
  // Validate nonce format
  if (!nonce || nonce.length !== NONCE_LENGTH || !/^[a-f0-9]+$/i.test(nonce)) {
    logger.warn({ nonce: nonce?.substring(0, 8) }, 'Invalid nonce format');
    return null;
  }

  // Try Redis first
  if (redis) {
    try {
      let data: string | null;
      
      try {
        data = await redis.getdel(`${REDIS_PREFIX}${nonce}`);
      } catch {
        const multi = redis.multi();
        multi.get(`${REDIS_PREFIX}${nonce}`);
        multi.del(`${REDIS_PREFIX}${nonce}`);
        const results = await multi.exec();
        data = results?.[0]?.[1] || null;
      }

      if (!data) {
        logger.debug({ nonce: nonce.substring(0, 8) + '...' }, 'Nonce not found (Redis)');
        return null;
      }

      const nonceData: NonceData = JSON.parse(data);
      nonceData.expiresAt = new Date(nonceData.expiresAt);
      nonceData.createdAt = new Date(nonceData.createdAt);
      
      if (nonceData.expiresAt < new Date()) {
        logger.debug({ nonce: nonce.substring(0, 8) + '...' }, 'Nonce expired');
        return null;
      }

      logger.debug({ nonce: nonce.substring(0, 8) + '...' }, 'Nonce consumed (Redis)');
      return nonceData;
    } catch (error) {
      logger.warn({ error }, 'Redis nonce consumption failed, falling back to Prisma');
    }
  }

  // Fallback to Prisma with transaction for atomicity
  try {
    const result = await prisma.$transaction(async (tx) => {
      const nonceRecord = await tx.authNonce.findUnique({
        where: { nonce },
      });

      if (!nonceRecord) {
        return null;
      }

      if (nonceRecord.usedAt) {
        logger.warn({ nonce: nonce.substring(0, 8) + '...' }, 'Nonce already used');
        return null;
      }

      if (nonceRecord.expiresAt < new Date()) {
        await tx.authNonce.delete({ where: { nonce } });
        logger.debug({ nonce: nonce.substring(0, 8) + '...' }, 'Nonce expired');
        return null;
      }

      await tx.authNonce.update({
        where: { nonce },
        data: { usedAt: new Date() },
      });

      return {
        nonce: nonceRecord.nonce,
        sessionId: nonceRecord.sessionId || undefined,
        expiresAt: nonceRecord.expiresAt,
        createdAt: nonceRecord.createdAt,
      };
    });

    if (result) {
      logger.debug({ nonce: nonce.substring(0, 8) + '...' }, 'Nonce consumed (Prisma)');
    }

    return result;
  } catch (error) {
    logger.error({ error, nonce: nonce.substring(0, 8) + '...' }, 'Nonce consumption failed');
    return null;
  }
}

/**
 * Validate a nonce without consuming it
 */
export async function validateNonce(nonce: string): Promise<boolean> {
  if (!nonce || nonce.length !== NONCE_LENGTH || !/^[a-f0-9]+$/i.test(nonce)) {
    return false;
  }

  if (redis) {
    try {
      const exists = await redis.exists(`${REDIS_PREFIX}${nonce}`);
      return exists === 1;
    } catch {
      // Fall through to Prisma
    }
  }

  const nonceRecord = await prisma.authNonce.findUnique({
    where: { nonce },
    select: { expiresAt: true, usedAt: true },
  });

  return nonceRecord !== null && 
         nonceRecord.usedAt === null && 
         nonceRecord.expiresAt > new Date();
}

/**
 * Clean up expired nonces from Prisma
 */
export async function cleanupExpiredNonces(): Promise<number> {
  const result = await prisma.authNonce.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { not: null } },
      ],
    },
  });

  if (result.count > 0) {
    logger.info({ count: result.count }, 'Cleaned up expired nonces');
  }

  return result.count;
}

/**
 * Get nonce statistics
 */
export async function getNonceStats(): Promise<{
  active: number;
  expired: number;
  used: number;
}> {
  const now = new Date();

  const [active, expired, used] = await Promise.all([
    prisma.authNonce.count({
      where: { expiresAt: { gte: now }, usedAt: null },
    }),
    prisma.authNonce.count({
      where: { expiresAt: { lt: now }, usedAt: null },
    }),
    prisma.authNonce.count({
      where: { usedAt: { not: null } },
    }),
  ]);

  return { active, expired, used };
}

export default {
  generateNonce,
  createNonce,
  consumeNonce,
  validateNonce,
  cleanupExpiredNonces,
  getNonceStats,
};
