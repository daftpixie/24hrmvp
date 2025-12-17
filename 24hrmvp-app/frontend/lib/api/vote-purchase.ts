// ============================================
// 24HRMVP - VOTE PURCHASE API
// File: frontend/lib/api/vote-purchase.ts
// API client for vote purchasing and credits
// ============================================

import { get, post, ApiError } from './client';

// ============================================
// TYPES
// ============================================

export interface UserCredits {
  success: boolean;
  credits: number;
  userId: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  popular?: boolean;
}

export interface PackagesResponse {
  success: boolean;
  packages: CreditPackage[];
}

export interface PurchaseRequest {
  packageId: string;
  paymentMethod: 'stripe' | 'coinbase' | 'points';
}

export interface PurchaseResponse {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  message?: string;
}

export interface TransactionHistory {
  success: boolean;
  transactions: {
    id: string;
    type: 'purchase' | 'spend' | 'refund' | 'bonus';
    amount: number;
    description: string;
    createdAt: string;
  }[];
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get user's current credit balance
 */
export async function getCredits(): Promise<UserCredits> {
  try {
    return await get<UserCredits>('/api/vote-purchase/credits', true);
  } catch (error) {
    console.error('Failed to fetch credits:', error);
    // Return default instead of throwing for non-critical failures
    return { success: false, credits: 0, userId: '' };
  }
}

/**
 * Get available credit packages
 */
export async function getPackages(): Promise<PackagesResponse> {
  try {
    return await get<PackagesResponse>('/api/vote-purchase/packages');
  } catch (error) {
    console.error('Failed to fetch packages:', error);
    throw error;
  }
}

/**
 * Initiate a credit purchase
 */
export async function purchaseCredits(data: PurchaseRequest): Promise<PurchaseResponse> {
  try {
    return await post<PurchaseResponse>('/api/vote-purchase/checkout', data, true);
  } catch (error) {
    console.error('Failed to initiate purchase:', error);
    throw error;
  }
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(): Promise<TransactionHistory> {
  try {
    return await get<TransactionHistory>('/api/vote-purchase/transactions', true);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
}

/**
 * Spend credits on a vote
 */
export async function spendCreditsOnVote(ideaId: string, voteCount: number = 1): Promise<{
  success: boolean;
  remainingCredits: number;
  message?: string;
}> {
  try {
    return await post('/api/vote-purchase/spend', { ideaId, voteCount }, true);
  } catch (error) {
    console.error('Failed to spend credits:', error);
    throw error;
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  getCredits,
  getPackages,
  purchaseCredits,
  getTransactionHistory,
  spendCreditsOnVote,
};
