/**
 * Authentication Types
 * 
 * Type definitions for multichain authentication.
 * NOTE: Express Request.user is augmented in types/express.d.ts
 * 
 * @version 2.0.0
 */

import { ChainType, AuthProvider } from '@prisma/client';

// ============================================
// CORE AUTH TYPES
// ============================================

// Auth source type - tracks how user authenticated
export type AuthSource = 'farcaster' | 'siwe' | 'siws';

// Authenticated user type - matches Express.Request.user
export interface AuthUser {
  id: string;
  fid?: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  email?: string;
  walletAddress?: string;
  chainType?: ChainType;
  chainId?: number;
  authSource?: AuthSource;
  isAdmin?: boolean;
  isBanned?: boolean;
}

// ============================================
// AUTH PROVIDER HELPERS
// ============================================

/**
 * Map AuthProvider enum to AuthSource string
 */
export function authProviderToSource(provider: AuthProvider): 'farcaster' | 'siwe' | 'siws' {
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

/**
 * Map AuthSource string to AuthProvider enum
 */
export function authSourceToProvider(source: 'farcaster' | 'siwe' | 'siws'): AuthProvider {
  switch (source) {
    case 'farcaster':
      return 'FARCASTER';
    case 'siwe':
      return 'SIWE';
    case 'siws':
      return 'SIWS';
    default:
      return 'FARCASTER';
  }
}

// ============================================
// JWT TOKEN TYPES
// ============================================

/**
 * JWT access token payload
 */
export interface AccessTokenPayload {
  userId: string;
  fid?: number;
  walletAddress?: string;
  chainType?: ChainType;
  chainId?: number;
  authSource: 'farcaster' | 'siwe' | 'siws';
  iat: number;
  exp: number;
}

/**
 * JWT refresh token payload
 */
export interface RefreshTokenPayload {
  userId: string;
  authSource: 'farcaster' | 'siwe' | 'siws';
  iat: number;
  exp: number;
}

/**
 * Generated token pair
 */
export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: Date;
}

// ============================================
// SIWE/SIWS MESSAGE TYPES
// ============================================

/**
 * Parsed SIWE message (EIP-4361)
 */
export interface SiweMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

/**
 * Parsed SIWS message
 */
export interface SiwsMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  requestId?: string;
  resources?: string[];
}

/**
 * Signature verification result
 */
export interface VerificationResult {
  success: boolean;
  address?: string;
  chainId?: number;
  error?: string;
}

// ============================================
// NONCE TYPES
// ============================================

/**
 * Nonce data stored in Redis/DB
 */
export interface NonceData {
  nonce: string;
  chainType: ChainType;
  sessionId?: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Result of nonce creation
 */
export interface CreateNonceResult {
  nonce: string;
  expiresAt: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Nonce request query parameters
 */
export interface NonceQuery {
  address: string;
  chainType: 'EVM' | 'SOLANA';
  chainId?: string;
}

/**
 * SIWE verification request body
 */
export interface SiweVerifyBody {
  message: string;
  signature: string;
}

/**
 * SIWS verification request body
 */
export interface SiwsVerifyBody {
  message: string;
  signature: string;
  publicKey: string;
}

/**
 * Wallet link request body
 */
export interface WalletLinkBody {
  message: string;
  signature: string;
  publicKey?: string;
  chainType: 'EVM' | 'SOLANA';
}

/**
 * Token refresh request body
 */
export interface RefreshTokenBody {
  refreshToken: string;
}

/**
 * Auth verification response
 */
export interface AuthVerifyResponse {
  success: boolean;
  user?: {
    id: string;
    fid: number | null;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
    authSource: 'farcaster' | 'siwe' | 'siws';
    isAdmin: boolean;
    membershipTier: string;
    points: number;
    level: number;
  };
  isNew?: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ============================================
// WALLET TYPES
// ============================================

/**
 * Connected wallet information
 */
export interface ConnectedWallet {
  id: string;
  address: string;
  chainType: ChainType;
  chainId?: number;
  isPrimary: boolean;
  label?: string;
  verifiedAt: Date;
  lastUsedAt: Date;
}

/**
 * Supported chain configuration
 */
export interface SupportedChain {
  chainId: number;
  name: string;
  type: 'EVM' | 'SOLANA';
}

// ============================================
// ACCOUNT TYPES
// ============================================

/**
 * Connected authentication account
 */
export interface ConnectedAccount {
  id: string;
  provider: AuthProvider;
  fid?: number;
  walletAddress?: string;
  chainType?: ChainType;
  lastUsedAt: Date;
}

/**
 * User profile with connected accounts
 */
export interface UserProfile {
  id: string;
  fid: number | null;
  username: string;
  displayName: string | null;
  pfpUrl: string | null;
  bio: string | null;
  primaryAuthProvider: AuthProvider;
  primaryWalletAddress: string | null;
  membershipTier: string;
  points: number;
  reputation: number;
  level: number;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: Date;
  lastActiveAt: Date;
  accounts?: ConnectedAccount[];
  wallets?: ConnectedWallet[];
}

// ============================================
// ERROR TYPES
// ============================================

/**
 * Authentication error codes
 */
export type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'INVALID_ADDRESS'
  | 'UNSUPPORTED_CHAIN'
  | 'VERIFICATION_FAILED'
  | 'NONCE_EXPIRED'
  | 'NONCE_USED'
  | 'WALLET_REQUIRED'
  | 'FARCASTER_REQUIRED'
  | 'LINK_FAILED'
  | 'LAST_AUTH_METHOD'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR';

/**
 * Authentication error
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
