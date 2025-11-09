import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface AuthState {
  isAuthenticated: boolean;
  fid: number | null;
  username: string | null;
  loading: boolean;
}

export function useFarcasterAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    fid: null,
    username: null,
    loading: true
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const context = await sdk.context.get();
      if (context?.user) {
        setAuthState({
          isAuthenticated: true,
          fid: context.user.fid,
          username: context.user.username || null,
          loading: false
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          fid: null,
          username: null,
          loading: false
        });
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
      setAuthState({
        isAuthenticated: false,
        fid: null,
        username: null,
        loading: false
      });
    }
  };

  const authenticate = async () => {
    try {
      // Use Quick Auth to verify with backend
      const res = await sdk.quickAuth.fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`);
      
      if (res.ok) {
        const data = await res.json();
        setAuthState({
          isAuthenticated: true,
          fid: data.fid,
          username: data.username,
          loading: false
        });
        return data;
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthState({
        isAuthenticated: false,
        fid: null,
        username: null,
        loading: false
      });
      throw error;
    }
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      fid: null,
      username: null,
      loading: false
    });
  };

  return {
    ...authState,
    authenticate,
    logout,
    checkAuth
  };
}
