// ============================================
// 24HRMVP - WALLET TYPES
// File: frontend/types/wallet.ts
// Type definitions for wallet authentication
// ============================================

export type WalletType = 'ethereum' | 'solana' | 'farcaster';

export interface BaseWallet {
  address: string;
  isConnected: boolean;
  isAuthenticated: boolean;
}

export interface EthereumWallet extends BaseWallet {
  type: 'ethereum';
  chainId: number;
  ensName?: string;
}

export interface SolanaWallet extends BaseWallet {
  type: 'solana';
  publicKey: string;
}

export interface FarcasterWallet {
  type: 'farcaster';
  fid: number;
  username: string;
  custodyAddress: string;
  verifications: string[];
}

export type Wallet = EthereumWallet | SolanaWallet | FarcasterWallet;

export interface WalletAuthSession {
  walletType: WalletType;
  address: string;
  signature: string;
  message: string;
  timestamp: number;
  expiresAt?: number;
}

export interface WalletConnectionOptions {
  autoConnect?: boolean;
  requireAuth?: boolean;
  onConnect?: (wallet: Wallet) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface WalletButtonProps {
  className?: string;
  variant?: 'default' | 'compact';
  onConnect?: (wallet: Wallet) => void;
}

export interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface AuthButtonProps {
  className?: string;
  showFarcaster?: boolean;
  showWallet?: boolean;
  variant?: 'default' | 'compact' | 'full';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format Ethereum/EVM address
 */
export function formatAddress(address: string, digits: number = 4): string {
  if (!address) return '';
  if (address.length <= digits * 2 + 2) return address;
  return `${address.slice(0, digits + 2)}...${address.slice(-digits)}`;
}

/**
 * Format Solana address
 */
export function formatSolanaAddress(address: string, digits: number = 4): string {
  if (!address) return '';
  if (address.length <= digits * 2) return address;
  return `${address.slice(0, digits)}...${address.slice(-digits)}`;
}
