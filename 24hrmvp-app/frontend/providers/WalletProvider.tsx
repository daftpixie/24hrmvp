/**
 * Wallet Provider - RainbowKit + Wagmi Integration
 * 
 * @version 6.0.0 - Fixed double initialization
 * 
 * This provider wraps the app with:
 * - WagmiProvider for blockchain interactions
 * - QueryClientProvider for React Query
 * - RainbowKitProvider for wallet UI
 * 
 * IMPORTANT: This must wrap AuthProvider in the component tree
 */

'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, type Theme } from '@rainbow-me/rainbowkit';

// Import the singleton config
import { config } from '@/lib/wagmi';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

// ============================================
// QUERY CLIENT (Singleton)
// ============================================

let queryClient: QueryClient | null = null;

function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return queryClient;
}

// ============================================
// CUSTOM THEME
// ============================================

const customTheme: Theme = {
  ...darkTheme({
    accentColor: '#04D9FF',
    accentColorForeground: '#0B192A',
    borderRadius: 'medium',
    fontStack: 'system',
    overlayBlur: 'small',
  }),
  colors: {
    ...darkTheme().colors,
    modalBackground: '#1A1A1A',
    modalBorder: 'rgba(4, 217, 255, 0.2)',
    profileForeground: '#1E1E1E',
    closeButton: '#808080',
    closeButtonBackground: 'rgba(255, 255, 255, 0.05)',
    actionButtonBorder: 'rgba(4, 217, 255, 0.3)',
    actionButtonSecondaryBackground: 'rgba(4, 217, 255, 0.1)',
    error: '#FF5C00',
  },
};

// ============================================
// MOUNTED CONTEXT
// ============================================

const WalletMountedContext = React.createContext(false);

export function useWalletMounted(): boolean {
  return React.useContext(WalletMountedContext);
}

// ============================================
// PROVIDER COMPONENT
// ============================================

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Track client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get or create the query client
  const client = getQueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider
          theme={customTheme}
          modalSize="compact"
          appInfo={{
            appName: '24HRMVP',
            learnMoreUrl: 'https://24hrmvp.xyz/about',
          }}
        >
          <WalletMountedContext.Provider value={mounted}>
            {children}
          </WalletMountedContext.Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default WalletProvider;
