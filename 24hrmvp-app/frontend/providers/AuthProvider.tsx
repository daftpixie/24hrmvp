// ============================================
// 24HRMVP - AUTH PROVIDER (PRODUCTION READY)
// File: frontend/providers/AuthProvider.tsx
// FIXED: Added walletAddress to User type
// FIXED: Export getToken helper function
// FIXED: Export isLoading in context type
// ============================================

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getApiUrl } from '@/lib/config';

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  fid: number;
  username: string;
  displayName: string | null;
  pfpUrl: string | null;
  custodyAddress: string | null;
  walletAddress: string | null; // Added for wallet auth
  membershipTier: string;
  points: number;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ============================================
// TOKEN STORAGE KEY
// ============================================

const TOKEN_KEY = 'jwt_token';
const USER_KEY = 'user_data';

// ============================================
// TOKEN HELPER FUNCTIONS (Exported)
// ============================================

/**
 * Get the current JWT token from storage
 * @returns The JWT token or null if not found
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

/**
 * Set the JWT token in storage
 * @param token The JWT token to store
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the JWT token from storage
 */
export function removeToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

/**
 * Get cached user data from storage
 */
export function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userData = sessionStorage.getItem(USER_KEY);
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

/**
 * Cache user data in storage
 */
export function setCachedUser(user: User): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER COMPONENT
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH CURRENT USER
  // ============================================

  const fetchUser = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeToken();
          setUser(null);
          return;
        }
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
        setCachedUser(data.user);
      } else if (data.user) {
        setUser(data.user);
        setCachedUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      // Try to use cached user on error
      const cachedUser = getCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // INITIALIZE AUTH
  // ============================================

  useEffect(() => {
    // Try to load cached user first for faster initial render
    const cachedUser = getCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
    }
    
    // Then verify with server
    fetchUser();
  }, [fetchUser]);

  // ============================================
  // LOGIN HANDLER
  // ============================================

  const login = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      // This will be called after Farcaster Quick Auth completes
      // The token should already be set by the auth callback
      await fetchUser();
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  // ============================================
  // LOGOUT HANDLER
  // ============================================

  const logout = useCallback(async () => {
    setError(null);
    
    try {
      const token = getToken();
      if (token) {
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }).catch(() => {
          // Ignore logout API errors
        });
      }
    } finally {
      removeToken();
      setUser(null);
    }
  }, []);

  // ============================================
  // REFRESH USER
  // ============================================

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
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
// DEFAULT EXPORT
// ============================================

export default AuthProvider;
