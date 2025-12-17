/**
 * Wallet Authentication API Client - SIWE Only
 * 
 * Frontend API client for Sign-In with Ethereum (SIWE) authentication.
 * Handles nonce generation, signature verification, and token management.
 * 
 * @version 2.0.0 - SIWE Only (Production Ready)
 */

// ============================================
// CONFIGURATION
// ============================================

const getApiUrl = (): string => {
  // Use environment variable, with fallback for production
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
};

// ============================================
// TYPES
// ============================================

export interface NonceResponse {
  success: boolean;
  nonce: string;
  message: string;
  expiresAt: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    fid?: number;
    username: string;
    displayName?: string;
    pfpUrl?: string;
    walletAddress?: string;
  };
  isNew?: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface SessionResponse {
  success: boolean;
  user?: {
    id: string;
    fid?: number;
    username: string;
    displayName?: string;
    pfpUrl?: string;
    walletAddress?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ChainInfo {
  chainId: number;
  name: string;
}

export interface ChainsResponse {
  success: boolean;
  chains: ChainInfo[];
}

// ============================================
// TOKEN STORAGE (Memory-only for security)
// ============================================

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiresAt: Date | null = null;

export function setTokens(access: string, refresh: string, expiresAt: string): void {
  accessToken = access;
  refreshToken = refresh;
  tokenExpiresAt = new Date(expiresAt);
  
  // Also store in sessionStorage for page refresh persistence
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('24hrmvp_access_token', access);
      sessionStorage.setItem('24hrmvp_refresh_token', refresh);
      sessionStorage.setItem('24hrmvp_token_expires', expiresAt);
    } catch {
      // sessionStorage not available
    }
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  
  // Try to restore from sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('24hrmvp_access_token');
      if (stored) {
        accessToken = stored;
        refreshToken = sessionStorage.getItem('24hrmvp_refresh_token');
        const expires = sessionStorage.getItem('24hrmvp_token_expires');
        tokenExpiresAt = expires ? new Date(expires) : null;
        return accessToken;
      }
    } catch {
      // sessionStorage not available
    }
  }
  
  return null;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  tokenExpiresAt = null;
  
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('24hrmvp_access_token');
      sessionStorage.removeItem('24hrmvp_refresh_token');
      sessionStorage.removeItem('24hrmvp_token_expires');
    } catch {
      // sessionStorage not available
    }
  }
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token || !tokenExpiresAt) return false;
  
  // Check if token is expired (with 60s buffer)
  return tokenExpiresAt.getTime() > Date.now() + 60000;
}

// ============================================
// API HELPERS
// ============================================

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  
  if (!response.ok) {
    console.error('[wallet-auth] API error:', data);
    throw new Error(data.error?.message || `HTTP ${response.status}`);
  }
  
  return data as T;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// ============================================
// NONCE GENERATION
// ============================================

/**
 * Get a nonce and SIWE message for wallet signing
 */
export async function getNonce(
  address: string,
  chainId: number = 1
): Promise<NonceResponse> {
  const apiUrl = getApiUrl();
  
  // Build query string
  const params = new URLSearchParams({
    address,
    chainId: chainId.toString(),
  });
  
  const url = `${apiUrl}/api/auth/wallet/nonce?${params.toString()}`;
  
  console.log('[wallet-auth] getNonce:', { 
    address: address.substring(0, 10) + '...', 
    chainId, 
    url 
  });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    const data = await handleResponse<NonceResponse>(response);
    
    console.log('[wallet-auth] getNonce success:', { 
      nonce: data.nonce?.substring(0, 10) + '...' 
    });
    
    return data;
  } catch (error) {
    console.error('[wallet-auth] getNonce error:', error);
    throw error;
  }
}

// ============================================
// SIWE VERIFICATION
// ============================================

/**
 * Verify a signed SIWE message and authenticate
 */
export async function verifySiweSignature(
  message: string,
  signature: string
): Promise<AuthResponse> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/auth/wallet/verify/siwe`;
  
  console.log('[wallet-auth] verifySiweSignature:', { 
    messageLength: message.length,
    signaturePrefix: signature.substring(0, 10) + '...',
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, signature }),
    });

    const data = await handleResponse<AuthResponse>(response);
    
    // Store tokens if authentication successful
    if (data.success && data.accessToken && data.refreshToken && data.expiresAt) {
      setTokens(data.accessToken, data.refreshToken, data.expiresAt);
      console.log('[wallet-auth] verifySiweSignature success:', { 
        userId: data.user?.id,
        isNew: data.isNew,
      });
    }
    
    return data;
  } catch (error) {
    console.error('[wallet-auth] verifySiweSignature error:', error);
    throw error;
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get current authenticated session
 */
export async function getSession(): Promise<SessionResponse> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/auth/session`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    return await handleResponse<SessionResponse>(response);
  } catch (error) {
    console.error('[wallet-auth] getSession error:', error);
    return { success: false };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<AuthResponse | null> {
  if (!refreshToken) {
    console.warn('[wallet-auth] No refresh token available');
    return null;
  }

  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/auth/wallet/refresh`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    const data = await handleResponse<AuthResponse>(response);
    
    if (data.success && data.accessToken && data.refreshToken && data.expiresAt) {
      setTokens(data.accessToken, data.refreshToken, data.expiresAt);
    }
    
    return data;
  } catch (error) {
    console.error('[wallet-auth] refreshAccessToken error:', error);
    clearTokens();
    return null;
  }
}

/**
 * Logout and clear session
 */
export async function logout(): Promise<void> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/auth/logout`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
  } catch (error) {
    console.error('[wallet-auth] logout error:', error);
  } finally {
    clearTokens();
  }
}

// ============================================
// WALLET MANAGEMENT
// ============================================

/**
 * Link a new wallet to existing account
 */
export async function linkWallet(
  message: string,
  signature: string
): Promise<AuthResponse> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/auth/wallet/link`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ message, signature }),
    });

    return await handleResponse<AuthResponse>(response);
  } catch (error) {
    console.error('[wallet-auth] linkWallet error:', error);
    throw error;
  }
}

/**
 * Get list of wallets linked to account
 */
export async function getWallets(): Promise<{ success: boolean; wallets: any[] }> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/auth/wallet/wallets`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    return await handleResponse<{ success: boolean; wallets: any[] }>(response);
  } catch (error) {
    console.error('[wallet-auth] getWallets error:', error);
    return { success: false, wallets: [] };
  }
}

/**
 * Unlink a wallet from account
 */
export async function unlinkWallet(walletId: string): Promise<{ success: boolean }> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/auth/wallet/wallets/${walletId}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    return await handleResponse<{ success: boolean }>(response);
  } catch (error) {
    console.error('[wallet-auth] unlinkWallet error:', error);
    throw error;
  }
}

// ============================================
// CHAIN INFORMATION
// ============================================

/**
 * Get list of supported chains
 */
export async function getSupportedChains(): Promise<ChainsResponse> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/api/auth/wallet/chains`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return await handleResponse<ChainsResponse>(response);
  } catch (error) {
    console.error('[wallet-auth] getSupportedChains error:', error);
    return { 
      success: false, 
      chains: [
        { chainId: 1, name: 'Ethereum' },
        { chainId: 8453, name: 'Base' },
      ] 
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Nonce & Auth
  getNonce,
  verifySiweSignature,
  
  // Session
  getSession,
  refreshAccessToken,
  logout,
  
  // Tokens
  setTokens,
  getAccessToken,
  clearTokens,
  isAuthenticated,
  
  // Wallet Management
  linkWallet,
  getWallets,
  unlinkWallet,
  
  // Chain Info
  getSupportedChains,
};
