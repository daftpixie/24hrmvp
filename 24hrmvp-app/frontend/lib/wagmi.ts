/**
 * Wagmi Configuration for 24HRMVP
 * 
 * @version 5.1.0 - Updated for RainbowKit 2.x + Wagmi 2.x
 * 
 * This file exports the wagmi config used throughout the app.
 * The config is created using RainbowKit's getDefaultConfig for
 * seamless integration with the RainbowKit UI.
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base, polygon, arbitrum, optimism } from 'wagmi/chains';
import { http } from 'wagmi';

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

export const SUPPORTED_CHAINS = [
  mainnet,
  base,
  polygon,
  arbitrum,
  optimism,
] as const;

export const WALLETCONNECT_PROJECT_ID = 
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '5ac1003d6254111216201e5042cb4675';

const APP_NAME = '24HRMVP';
const APP_DESCRIPTION = 'Community-driven 24-hour MVP development platform';
const APP_ICON = 'https://24hrmvp.xyz/icon.png';

// ============================================
// TRANSPORT CONFIGURATION
// ============================================

const transports = {
  [mainnet.id]: http(),
  [base.id]: http(),
  [polygon.id]: http(),
  [arbitrum.id]: http(),
  [optimism.id]: http(),
};

// ============================================
// APP URL HELPER
// ============================================

function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://24hrmvp.xyz';
}

// ============================================
// WAGMI CONFIG (using RainbowKit's getDefaultConfig)
// ============================================

// Note: getDefaultConfig creates a properly configured wagmi config
// with all necessary connectors for RainbowKit (WalletConnect, Coinbase, etc.)
export const config = getDefaultConfig({
  appName: APP_NAME,
  appDescription: APP_DESCRIPTION,
  appUrl: getAppUrl(),
  appIcon: APP_ICON,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: SUPPORTED_CHAINS,
  transports,
  ssr: true, // Enable SSR support
});

export default config;
