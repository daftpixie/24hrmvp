/**
 * Token Store - Single Source of Truth for Authentication
 * 
 * @version 6.0.0 - Unified token management
 * 
 * This module provides a centralized token storage mechanism that:
 * - Uses sessionStorage for persistence across page refreshes
 * - Provides a single API for all auth-related token operations
 * - Supports both JWT tokens and user data caching
 */

// ============================================
// STORAGE KEYS (Single source of truth)
// ============================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  TOKEN_EXPIRES: 'auth_token_expires',
  USER_DATA: 'auth_user_data',
} as const;

// ============================================
// TYPES
// ============================================

export interface StoredUser {
  id: string;
  fid?: number;
  username: string;
  displayName?: string | null;
  pfpUrl?: string | null;
  custodyAddress?: string | null;
  walletAddress?: string | null;
  membershipTier?: string;
  points?: number;
  createdAt?: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// ============================================
// IN-MEMORY CACHE (for performance)
// ============================================

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let cachedExpiresAt: Date | null = null;
let cachedUser: StoredUser | null = null;

// ============================================
// STORAGE HELPERS
// ============================================

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    // Test if sessionStorage is accessible
    const test = '__storage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return sessionStorage;
  } catch {
    return null;
  }
}

// ============================================
// TOKEN OPERATIONS
// ============================================

/**
 * Store authentication tokens
 */
export function setTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: string | Date
): void {
  const expiresDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  
  // Update in-memory cache
  cachedAccessToken = accessToken;
  cachedRefreshToken = refreshToken;
  cachedExpiresAt = expiresDate;
  
  // Persist to storage
  const storage = safeStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      storage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, expiresDate.toISOString());
    } catch (e) {
      console.warn('[TokenStore] Failed to persist tokens:', e);
    }
  }
}

/**
 * Get access token (from cache or storage)
 */
export function getAccessToken(): string | null {
  // Return from cache if available
  if (cachedAccessToken) return cachedAccessToken;
  
  // Try to restore from storage
  const storage = safeStorage();
  if (storage) {
    try {
      const token = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        cachedAccessToken = token;
        cachedRefreshToken = storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const expires = storage.getItem(STORAGE_KEYS.TOKEN_EXPIRES);
        cachedExpiresAt = expires ? new Date(expires) : null;
        return cachedAccessToken;
      }
    } catch {
      // Storage not available
    }
  }
  
  return null;
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | null {
  if (cachedRefreshToken) return cachedRefreshToken;
  
  // Trigger token restoration from storage
  getAccessToken();
  return cachedRefreshToken;
}

/**
 * Check if tokens are valid (not expired)
 */
export function hasValidTokens(): boolean {
  const token = getAccessToken();
  if (!token || !cachedExpiresAt) return false;
  
  // Add 60 second buffer for token refresh
  return cachedExpiresAt.getTime() > Date.now() + 60000;
}

/**
 * Clear all tokens
 */
export function clearTokens(): void {
  // Clear in-memory cache
  cachedAccessToken = null;
  cachedRefreshToken = null;
  cachedExpiresAt = null;
  cachedUser = null;
  
  // Clear storage
  const storage = safeStorage();
  if (storage) {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        storage.removeItem(key);
      });
    } catch {
      // Ignore storage errors
    }
  }
  
  // Also clear any legacy keys that might exist
  if (storage) {
    try {
      // Legacy AuthProvider keys
      storage.removeItem('jwt_token');
      storage.removeItem('user_data');
      // Legacy wallet-auth keys
      storage.removeItem('24hrmvp_access_token');
      storage.removeItem('24hrmvp_refresh_token');
      storage.removeItem('24hrmvp_token_expires');
    } catch {
      // Ignore
    }
  }
}

// ============================================
// USER DATA OPERATIONS
// ============================================

/**
 * Store user data
 */
export function setUser(user: StoredUser): void {
  cachedUser = user;
  
  const storage = safeStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Get cached user data
 */
export function getUser(): StoredUser | null {
  if (cachedUser) return cachedUser;
  
  const storage = safeStorage();
  if (storage) {
    try {
      const data = storage.getItem(STORAGE_KEYS.USER_DATA);
      if (data) {
        cachedUser = JSON.parse(data);
        return cachedUser;
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  return null;
}

/**
 * Clear user data only (keep tokens)
 */
export function clearUser(): void {
  cachedUser = null;
  
  const storage = safeStorage();
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEYS.USER_DATA);
    } catch {
      // Ignore
    }
  }
}

// ============================================
// AUTH HEADERS HELPER
// ============================================

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): HeadersInit {
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
// LEGACY MIGRATION
// ============================================

/**
 * Migrate tokens from legacy storage keys
 * Call this once on app initialization
 */
export function migrateLegacyTokens(): void {
  const storage = safeStorage();
  if (!storage) return;
  
  // Already have tokens? Skip migration
  if (getAccessToken()) return;
  
  try {
    // Try legacy AuthProvider format
    const legacyToken = storage.getItem('jwt_token');
    if (legacyToken) {
      cachedAccessToken = legacyToken;
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, legacyToken);
      storage.removeItem('jwt_token');
      
      const legacyUser = storage.getItem('user_data');
      if (legacyUser) {
        storage.setItem(STORAGE_KEYS.USER_DATA, legacyUser);
        storage.removeItem('user_data');
      }
      return;
    }
    
    // Try legacy wallet-auth format
    const legacyWalletToken = storage.getItem('24hrmvp_access_token');
    if (legacyWalletToken) {
      cachedAccessToken = legacyWalletToken;
      cachedRefreshToken = storage.getItem('24hrmvp_refresh_token');
      const expires = storage.getItem('24hrmvp_token_expires');
      cachedExpiresAt = expires ? new Date(expires) : null;
      
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, legacyWalletToken);
      if (cachedRefreshToken) {
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, cachedRefreshToken);
      }
      if (expires) {
        storage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, expires);
      }
      
      // Clean up legacy keys
      storage.removeItem('24hrmvp_access_token');
      storage.removeItem('24hrmvp_refresh_token');
      storage.removeItem('24hrmvp_token_expires');
    }
  } catch {
    // Ignore migration errors
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  setTokens,
  getAccessToken,
  getRefreshToken,
  hasValidTokens,
  clearTokens,
  setUser,
  getUser,
  clearUser,
  getAuthHeaders,
  migrateLegacyTokens,
};
