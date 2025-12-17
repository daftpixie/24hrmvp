/**
 * Express Type Augmentation
 * 
 * Extends Express Request interface to include authenticated user.
 * 
 * UPDATED: Multichain auth support
 * - fid is now optional (wallet-only users don't have FID)
 * - Added chainType, chainId for wallet context
 * - Added authSource to track authentication method
 * - Added isAdmin, isBanned for authorization checks
 * 
 * NOTE: AuthUser type is defined in types/auth.ts and middleware/auth.ts
 * This file only provides the Express module augmentation.
 * 
 * @version 2.0.0 - Multichain Auth Support
 */

import { ChainType } from '@prisma/client';

// Auth source type - tracks how user authenticated
type AuthSource = 'farcaster' | 'siwe' | 'siws';

// Type augmentation for Express Request object
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;              // User ID from database (always present)
        fid?: number;            // Farcaster ID (optional - wallet-only users won't have this)
        username: string;        // Username (always present)
        displayName?: string;    // Display name (optional)
        pfpUrl?: string;         // Profile picture URL (optional)
        email?: string;          // Email (optional)
        walletAddress?: string;  // Primary wallet address (optional)
        
        // Multichain auth fields
        chainType?: ChainType;   // EVM or SOLANA (when authenticated via wallet)
        chainId?: number;        // Chain ID for EVM chains (1=Ethereum, 8453=Base, etc.)
        authSource?: AuthSource; // How user authenticated: 'farcaster', 'siwe', or 'siws'
        isAdmin?: boolean;       // Admin status (for authorization)
        isBanned?: boolean;      // Ban status (for access control)
      };
    }
  }
}

export {};
