/**
 * Auth Module Index
 * 
 * @version 6.0.0
 * 
 * Centralizes all auth-related exports.
 */

// Token store utilities
export {
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
  type StoredUser,
} from './token-store';

// Re-export for backward compatibility
export { getAccessToken as getToken } from './token-store';
