/**
 * useRequireAuth - Hook for Protected Pages
 * 
 * @version 6.0.0
 * 
 * Provides authentication requirement for pages that need a logged-in user.
 * Can redirect to home or show a custom login prompt.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

export interface UseRequireAuthOptions {
  /** Redirect to this path if not authenticated (default: null = no redirect) */
  redirectTo?: string | null;
  /** Show login prompt instead of redirecting */
  showLoginPrompt?: boolean;
}

export interface RequireAuthResult {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether we're still checking auth status */
  isLoading: boolean;
  /** The current user (if authenticated) */
  user: ReturnType<typeof useAuth>['user'];
  /** Whether to show a login prompt */
  showPrompt: boolean;
  /** Function to trigger sign in */
  signIn: ReturnType<typeof useAuth>['signIn'];
  /** Any auth error */
  error: string | null;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}): RequireAuthResult {
  const { redirectTo = null, showLoginPrompt = true } = options;
  const { user, isAuthenticated, isLoading, signIn, error } = useAuth();
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Wait until loading is complete
    if (isLoading) return;

    // If authenticated, hide any prompt
    if (isAuthenticated) {
      setShowPrompt(false);
      return;
    }

    // Not authenticated
    if (redirectTo) {
      // Redirect to specified path
      const returnUrl = typeof window !== 'undefined' ? window.location.pathname : '/';
      router.push(`${redirectTo}?redirect=${encodeURIComponent(returnUrl)}`);
    } else if (showLoginPrompt) {
      // Show login prompt
      setShowPrompt(true);
    }
  }, [isAuthenticated, isLoading, redirectTo, showLoginPrompt, router]);

  return {
    isAuthenticated,
    isLoading,
    user,
    showPrompt: showPrompt && !isLoading && !isAuthenticated,
    signIn,
    error,
  };
}

export default useRequireAuth;
