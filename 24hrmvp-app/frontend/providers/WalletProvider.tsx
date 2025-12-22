'use client';

/**
 * Wallet Provider - Wraps app with WagmiProvider and RainbowKitProvider
 * 
 * @version 5.1.0 - Robust fix for WagmiProviderNotFoundError
 * 
 * This provider MUST wrap your entire app for wallet functionality to work.
 * It handles SSR properly by only rendering wallet UI after hydration.
 */

import React, { useState, useEffect, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';

// Import wagmi config from centralized location
import { config as wagmiConfig } from '@/lib/wagmi';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

// ============================================
// QUERY CLIENT
// ============================================

// Create a stable query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Custom theme for RainbowKit matching 24HRMVP design
const customTheme = darkTheme({
  accentColor: '#04D9FF',
  accentColorForeground: '#0B192A',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

// ============================================
// PROVIDER COMPONENT
// ============================================

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Track if we're mounted (client-side)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render the providers - they handle SSR internally
  // But pass a flag down so child components know when it's safe to render wallet UI
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
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

// Context to let child components know when wallet is ready
const WalletMountedContext = React.createContext(false);

export function useWalletMounted() {
  return React.useContext(WalletMountedContext);
}

export default WalletProvider;
