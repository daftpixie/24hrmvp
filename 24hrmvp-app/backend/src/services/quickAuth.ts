/**
 * Farcaster Quick Auth Service
 * 
 * Wrapper around @farcaster/quick-auth for JWT verification.
 * Used by the unified auth middleware for Farcaster authentication.
 * 
 * @version 2.0.0
 */

import { createClient } from '@farcaster/quick-auth';

// Logger (optional)
let logger: any;
try {
  const loggerModule = require('../lib/logger');
  logger = loggerModule.authLogger || loggerModule.logger || console;
} catch {
  logger = console;
}

// Initialize Quick Auth client
const quickAuthClient = createClient();

/**
 * Quick Auth JWT payload structure
 */
export interface QuickAuthPayload {
  /** User's Farcaster ID */
  fid: number;
  
  /** Username */
  username?: string;
  
  /** Display name */
  displayName?: string;
  
  /** Profile picture URL */
  pfpUrl?: string;
  
  /** Custody address */
  custody?: string;
  
  /** Verified addresses */
  verifications?: string[];
}

/**
 * Raw JWT payload from Quick Auth
 */
interface RawQuickAuthPayload {
  sub: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  custody?: string;
  verifications?: string[];
}

/**
 * Verification result
 */
export interface QuickAuthResult {
  success: boolean;
  payload?: QuickAuthPayload;
  error?: string;
}

/**
 * Verify a Farcaster Quick Auth JWT token
 * 
 * @param token - The JWT token to verify
 * @param domain - The expected domain (defaults to APP_DOMAIN or 24hrmvp.xyz)
 * @returns Verification result with user payload
 */
export async function verifyQuickAuthJWT(
  token: string,
  domain?: string
): Promise<QuickAuthResult> {
  try {
    const verifyDomain = domain || process.env.APP_DOMAIN || process.env.QUICK_AUTH_DOMAIN || '24hrmvp.xyz';
    
    const payload = await quickAuthClient.verifyJwt({
      token,
      domain: verifyDomain,
    }) as unknown as RawQuickAuthPayload;

    if (!payload || !payload.sub) {
      return {
        success: false,
        error: 'Invalid token payload',
      };
    }

    const fid = parseInt(payload.sub, 10);
    
    if (isNaN(fid) || fid <= 0) {
      return {
        success: false,
        error: 'Invalid FID in token',
      };
    }

    return {
      success: true,
      payload: {
        fid,
        username: payload.username || undefined,
        displayName: payload.displayName || undefined,
        pfpUrl: payload.pfpUrl || undefined,
        custody: payload.custody || undefined,
        verifications: payload.verifications || [],
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Verification failed';
    
    // Log specific error types for debugging
    if (errorMessage.includes('expired')) {
      logger.debug('Quick Auth token expired');
      return {
        success: false,
        error: 'Token expired',
      };
    }
    
    if (errorMessage.includes('invalid') || errorMessage.includes('Invalid')) {
      logger.debug({ error: errorMessage }, 'Quick Auth token invalid');
      return {
        success: false,
        error: 'Invalid token',
      };
    }
    
    logger.error({ error }, 'Quick Auth verification failed');
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if a token is a Farcaster Quick Auth token
 * Quick heuristic based on JWT structure
 * 
 * @param token - The token to check
 * @returns True if likely a Farcaster Quick Auth token
 */
export function isQuickAuthToken(token: string): boolean {
  try {
    // JWT has 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // Try to decode header
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    
    // Farcaster Quick Auth uses specific algorithms
    return header.alg === 'ES256' || header.alg === 'EdDSA';
  } catch {
    return false;
  }
}

/**
 * Get the client for direct access if needed
 */
export function getQuickAuthClient() {
  return quickAuthClient;
}

// Export client as default for backward compatibility
export default quickAuthClient;
