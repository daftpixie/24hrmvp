'use client';

/**
 * Authentication Provider for 24HRMVP
 * 
 * PRODUCTION VERSION 4.5.0
 * - Fixed SessionResponse type handling (access .user property)
 * - Fixed verifySiweSignature signature (2 args, not 3)
 * - Added proper null checks for result.user
 * - SIWE-only authentication (removed SIWS)
 * 
 * @version 4.5.0
 */

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback, 
  ReactNode, 
  useRef,
  Component,
  ErrorInfo
} from 'react';

import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,
  ConnectButton,
  darkTheme,
  Theme,
} from '@rainbow-me/rainbowkit';

import { WagmiProvider } from 'wagmi';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { 
  getNonce, 
  verifySiweSignature, 
  getSession, 
  logout as logoutApi, 
  clearTokens, 
  getAccessToken, 
  isAuthenticated as checkIsAuthenticated 
} from '@/lib/api/wallet-auth';
import { Toaster, toast } from 'sonner';

// ============================================
// WALLETCONNECT ERROR SUPPRESSION
// ============================================
const SUPPRESSED_ERROR_PATTERNS = [
  'Connection interrupted',
  'WebSocket connection closed',
  'Pairing already exists',
  'No matching key',
  'Socket stalled',
  'Missing or invalid',
  'Relay connection',
  'JsonRpcError',
  'relay.walletconnect',
  'wss://',
  'code: 3000',
  'code: 3001',
  'trying to subscribe',
  'Socket disconnected',
  'Websocket error',
  'already initialized',
  'Multiple versions',
  'not found on Allowlist',
  'differs from the actual',
  'metadata.url',
];

function isWalletConnectError(message: string): boolean {
  if (!message) return false;
  const lowerMessage = message.toLowerCase();
  return SUPPRESSED_ERROR_PATTERNS.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  );
}

// Install global error handlers ONCE
if (typeof window !== 'undefined' && !(window as any).__wcErrorHandlersInstalled) {
  (window as any).__wcErrorHandlersInstalled = true;
  
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = function(...args: any[]) {
    const message = args.map(a => String(a)).join(' ');
    if (isWalletConnectError(message)) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[WC Suppressed]', message.slice(0, 100) + '...');
      }
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  console.warn = function(...args: any[]) {
    const message = args.map(a => String(a)).join(' ');
    if (isWalletConnectError(message)) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[WC Suppressed]', message.slice(0, 100) + '...');
      }
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason) || '';
    if (isWalletConnectError(message)) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || '';
    if (isWalletConnectError(message)) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });
}

// ============================================
// ERROR BOUNDARY
// ============================================
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WalletErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    if (isWalletConnectError(error.message || '')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!isWalletConnectError(error.message || '')) {
      console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B192A]">
          <div className="text-center p-8">
            <h2 className="text-xl text-red-400 mb-4">Connection Error</h2>
            <p className="text-gray-400 mb-4">
              There was an issue with the wallet connection.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#04D9FF] text-[#0B192A] rounded-lg font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================
// TYPES
// ============================================
export interface AuthUser {
  id: string;
  fid?: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  walletAddress?: string;
  authSource?: 'farcaster' | 'siwe';
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// ============================================
// THEME
// ============================================
const customTheme = darkTheme({
  accentColor: '#04D9FF',
  accentColorForeground: '#0B192A',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

const brandTheme: Theme = {
  ...customTheme,
  colors: {
    ...customTheme.colors,
    modalBackground: '#1E1E1E',
    modalBorder: 'rgba(4, 217, 255, 0.2)',
    profileForeground: '#0B192A',
    connectButtonBackground: 'transparent',
    connectButtonInnerBackground: '#1E1E1E',
    connectButtonText: '#04D9FF',
  },
  shadows: {
    ...customTheme.shadows,
    connectButton: '0 0 10px rgba(4, 217, 255, 0.2)',
    dialog: '0 0 30px rgba(4, 217, 255, 0.1)',
  },
};

// ============================================
// QUERY CLIENT (SINGLETON)
// ============================================
declare global {
  var __queryClient: QueryClient | undefined;
}

function getQueryClient(): QueryClient {
  if (!globalThis.__queryClient) {
    globalThis.__queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return globalThis.__queryClient;
}

// ============================================
// AUTH CONTEXT
// ============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================
// INTERNAL AUTH PROVIDER
// ============================================
function InternalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authAttempted, setAuthAttempted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { address, chainId, isConnected, isConnecting } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setIsMounted(true);
    console.log('[Auth] Provider mounted v4.5.0');
    return () => {
      setIsMounted(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Check existing session on mount
  useEffect(() => {
    if (!isMounted) return;

    const checkSession = async () => {
      try {
        setIsLoading(true);
        const token = getAccessToken();
        
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // FIX: getSession returns SessionResponse with nested .user property
        const sessionResponse = await getSession();
        
        if (sessionResponse.success && sessionResponse.user) {
          setUser({
            id: sessionResponse.user.id,
            fid: sessionResponse.user.fid,
            username: sessionResponse.user.username,
            displayName: sessionResponse.user.displayName,
            pfpUrl: sessionResponse.user.pfpUrl,
            walletAddress: sessionResponse.user.walletAddress,
            authSource: 'siwe',
          });
        } else {
          setUser(null);
          clearTokens();
        }
      } catch (err) {
        console.error('[Auth] Session check error:', err);
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [isMounted]);

  // Auto-SIWE when wallet connects
  useEffect(() => {
    if (!isMounted) return;
    if (user) return;
    if (authAttempted) return;
    if (isConnecting) return;
    if (!isConnected || !address) return;
    if (checkIsAuthenticated()) return;

    console.log('[Auth] Auto-SIWE for:', address.slice(0, 10) + '...');

    const triggerSiwe = async () => {
      setAuthAttempted(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        await performSiweAuth(address, chainId || 1);
        toast.success('Signed in successfully!');
      } catch (err: any) {
        const isUserRejection = 
          err?.code === 4001 || 
          err?.message?.includes('rejected') || 
          err?.message?.includes('denied') ||
          err?.message?.includes('User rejected');

        if (isUserRejection) {
          toast.error('Sign-in cancelled');
          timeoutRef.current = setTimeout(() => setAuthAttempted(false), 5000);
          return;
        }

        console.error('[Auth] Auto-SIWE error:', err);
        setError(err?.message || 'Authentication failed');
        toast.error(err?.message || 'Authentication failed');
      }
    };

    triggerSiwe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isMounted, isConnected, address, chainId, user, authAttempted, isConnecting]);

  const performSiweAuth = async (walletAddress: string, chain: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const nonceResponse = await getNonce(walletAddress, chain);
      const messageToSign = nonceResponse.message;

      if (!messageToSign) {
        throw new Error('No SIWE message received from server');
      }

      console.log('[Auth] Requesting signature...');
      const signature = await signMessageAsync({ message: messageToSign });
      console.log('[Auth] Signature received');

      // FIX: verifySiweSignature takes 2 arguments (message, signature)
      const result = await verifySiweSignature(messageToSign, signature);

      // FIX: Add null check for result.user
      if (!result.success || !result.user) {
        throw new Error(result.error?.message || 'Authentication failed - no user returned');
      }

      const newUser: AuthUser = {
        id: result.user.id,
        username: result.user.username,
        displayName: result.user.displayName || undefined,
        pfpUrl: result.user.pfpUrl || undefined,
        walletAddress: result.user.walletAddress,
        authSource: 'siwe',
      };

      console.log('[Auth] User authenticated:', newUser.username);
      setUser(newUser);
      setAuthAttempted(true);

      return result;
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async () => {
    if (!address) {
      toast.error('Please connect a wallet first');
      return;
    }

    setAuthAttempted(true);

    try {
      await performSiweAuth(address, chainId || 1);
      toast.success('Signed in successfully!');
    } catch (err: any) {
      if (err?.code === 4001) {
        toast.error('Sign-in cancelled');
        return;
      }
      setError(err?.message || 'Authentication failed');
      toast.error(err?.message || 'Authentication failed');
      throw err;
    }
  }, [address, chainId]);

  const logout = useCallback(async () => {
    console.log('[Auth] Logout');

    try { await logoutApi(); } catch (e) {}

    clearTokens();
    setUser(null);
    setAuthAttempted(false);
    setError(null);

    try { disconnect(); } catch (e) {}
    getQueryClient().clear();

    toast.success('Disconnected');
  }, [disconnect]);

  const refreshUser = useCallback(async () => {
    if (!checkIsAuthenticated()) {
      setUser(null);
      return;
    }

    try {
      // FIX: getSession returns SessionResponse with nested .user property
      const sessionResponse = await getSession();
      
      if (sessionResponse.success && sessionResponse.user) {
        setUser({
          id: sessionResponse.user.id,
          fid: sessionResponse.user.fid,
          username: sessionResponse.user.username,
          displayName: sessionResponse.user.displayName,
          pfpUrl: sessionResponse.user.pfpUrl,
          walletAddress: sessionResponse.user.walletAddress,
          authSource: 'siwe',
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('[Auth] Refresh error:', err);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: isLoading || isConnecting,
        error,
        login,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// MAIN AUTH PROVIDER
// ============================================
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [mounted, setMounted] = useState(false);
  const queryClient = getQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0B192A]">
        {children}
      </div>
    );
  }

  return (
    <WalletErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={brandTheme}
            modalSize="compact"
            showRecentTransactions={false}
            appInfo={{
              appName: '24HRMVP',
              learnMoreUrl: 'https://24hrmvp.xyz/about',
            }}
          >
            <InternalAuthProvider>
              {children}
              <Toaster 
                position="top-center" 
                theme="dark" 
                closeButton 
                richColors 
              />
            </InternalAuthProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </WalletErrorBoundary>
  );
}

export { AuthContext, ConnectButton };
export default AuthProvider;
