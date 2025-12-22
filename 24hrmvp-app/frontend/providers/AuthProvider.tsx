/**
 * Unified Auth Provider - Complete Authentication Solution
 * 
 * @version 6.0.0 - Unified wallet + auth flow
 * 
 * This provider:
 * - Manages authentication state across the entire app
 * - Integrates with RainbowKit wallet connection
 * - Handles SIWE (Sign-In with Ethereum) flow automatically
 * - Uses unified token storage
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  type ReactNode 
} from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { getApiUrl } from '@/lib/config';
import {
  setTokens,
  getAccessToken,
  clearTokens,
  setUser,
  getUser,
  hasValidTokens,
  getAuthHeaders,
  migrateLegacyTokens,
  type StoredUser,
} from '@/lib/auth/token-store';

// ============================================
// TYPES
// ============================================

export interface User extends StoredUser {}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siweMessage, setSiweMessage] = useState<string | null>(null);

  // Wagmi hooks
  const { address, isConnected, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  // ============================================
  // FETCH USER FROM BACKEND
  // ============================================

  const fetchUser = useCallback(async (): Promise<User | null> => {
    const token = getAccessToken();
    if (!token) return null;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearTokens();
          return null;
        }
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      const userData = data.user || data;
      
      if (userData?.id) {
        setUser(userData);
        return userData;
      }
      
      return null;
    } catch (err) {
      console.error('[AuthProvider] fetchUser error:', err);
      return null;
    }
  }, []);

  // ============================================
  // SIWE AUTHENTICATION FLOW
  // ============================================

  const requestNonce = useCallback(async (walletAddress: string, chainId: number) => {
    const apiUrl = getApiUrl();
    const params = new URLSearchParams({
      address: walletAddress,
      chainId: chainId.toString(),
    });

    const response = await fetch(`${apiUrl}/api/auth/wallet/nonce?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to get nonce');
    }

    return response.json();
  }, []);

  const verifySiweSignature = useCallback(async (message: string, signature: string) => {
    const apiUrl = getApiUrl();
    
    const response = await fetch(`${apiUrl}/api/auth/wallet/verify/siwe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, signature }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Verification failed');
    }

    return response.json();
  }, []);

  // ============================================
  // SIGN IN WITH CONNECTED WALLET
  // ============================================

  const signIn = useCallback(async () => {
    if (!address || !chain) {
      setError('Please connect your wallet first');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Step 1: Get nonce and message from backend
      console.log('[AuthProvider] Requesting nonce for', address.substring(0, 10) + '...');
      const nonceResponse = await requestNonce(address, chain.id);
      
      if (!nonceResponse.success || !nonceResponse.message) {
        throw new Error('Failed to get signing message');
      }

      setSiweMessage(nonceResponse.message);

      // Step 2: Sign the message with wallet
      console.log('[AuthProvider] Requesting signature...');
      const signature = await signMessageAsync({
        message: nonceResponse.message,
      });

      // Step 3: Verify signature with backend
      console.log('[AuthProvider] Verifying signature...');
      const authResponse = await verifySiweSignature(nonceResponse.message, signature);

      if (!authResponse.success) {
        throw new Error(authResponse.error?.message || 'Authentication failed');
      }

      // Step 4: Store tokens and user
      if (authResponse.accessToken && authResponse.refreshToken && authResponse.expiresAt) {
        setTokens(authResponse.accessToken, authResponse.refreshToken, authResponse.expiresAt);
      }

      if (authResponse.user) {
        setUser(authResponse.user);
        setUserState(authResponse.user);
      }

      console.log('[AuthProvider] Sign in successful');
      setSiweMessage(null);
    } catch (err) {
      console.error('[AuthProvider] Sign in error:', err);
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      setSiweMessage(null);
    } finally {
      setIsConnecting(false);
    }
  }, [address, chain, requestNonce, signMessageAsync, verifySiweSignature]);

  // ============================================
  // SIGN OUT
  // ============================================

  const signOut = useCallback(async () => {
    try {
      // Call logout endpoint if we have a token
      const token = getAccessToken();
      if (token) {
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
        }).catch(() => {});
      }
    } finally {
      // Clear all auth state
      clearTokens();
      setUserState(null);
      setError(null);
      
      // Disconnect wallet
      disconnect();
    }
  }, [disconnect]);

  // ============================================
  // REFRESH USER
  // ============================================

  const refreshUser = useCallback(async () => {
    const userData = await fetchUser();
    setUserState(userData);
  }, [fetchUser]);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    const initialize = async () => {
      // Migrate any legacy tokens first
      migrateLegacyTokens();

      // Try to restore session from cached user
      const cachedUser = getUser();
      if (cachedUser) {
        setUserState(cachedUser);
      }

      // Verify session with backend
      if (hasValidTokens()) {
        const userData = await fetchUser();
        setUserState(userData);
      } else {
        // Clear any invalid state
        if (!getAccessToken()) {
          setUserState(null);
        }
      }

      setIsLoading(false);
    };

    initialize();
  }, [fetchUser]);

  // ============================================
  // AUTO-SIGN IN ON WALLET CONNECT
  // ============================================

  useEffect(() => {
    // When wallet connects and we don't have a valid session, trigger sign in
    if (isConnected && address && !isLoading && !user && !isConnecting) {
      // Check if we should auto-sign in (only if we don't have valid tokens)
      if (!hasValidTokens()) {
        // Don't auto-sign in - let user click the button
        // This prevents unwanted signature requests
      }
    }
  }, [isConnected, address, isLoading, user, isConnecting]);

  // ============================================
  // HANDLE WALLET DISCONNECT
  // ============================================

  useEffect(() => {
    // If wallet disconnects, clear auth state
    if (!isConnected && user) {
      console.log('[AuthProvider] Wallet disconnected, clearing auth');
      clearTokens();
      setUserState(null);
    }
  }, [isConnected, user]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && hasValidTokens(),
    isConnecting,
    error,
    signIn,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================
// RE-EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================

export { 
  getAccessToken as getToken, 
  setTokens as setToken,
  clearTokens as removeToken,
} from '@/lib/auth/token-store';

export default AuthProvider;
