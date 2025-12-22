/**
 * Wagmi Configuration for 24HRMVP
 * 
 * @version 6.0.0 - Fixed double initialization issue
 * 
 * CRITICAL: This config is created ONCE and reused.
 * The getDefaultConfig call is memoized to prevent WalletConnect
 * from being initialized multiple times.
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base, polygon, arbitrum, optimism } from 'wagmi/chains';
import { http, type Config } from 'wagmi';

// ============================================
// SUPPORTED CHAINS
// ============================================

export const SUPPORTED_CHAINS = [
  mainnet,
  base,
  polygon,
  arbitrum,
  optimism,
] as const;

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

const WALLETCONNECT_PROJECT_ID = 
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '5ac1003d6254111216201e5042cb4675';

const APP_NAME = '24HRMVP';
const APP_DESCRIPTION = 'Community-driven 24-hour MVP development platform';

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
// SINGLETON CONFIG PATTERN
// ============================================

let _config: Config | null = null;

/**
 * Get or create the wagmi config
 * Uses singleton pattern to prevent multiple WalletConnect initializations
 */
function getOrCreateConfig(): Config {
  if (_config) {
    return _config;
  }

  // Determine app URL
  const appUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://24hrmvp.xyz');

  // Determine icon URL
  const appIcon = typeof window !== 'undefined'
    ? `${window.location.origin}/icon.png`
    : 'https://24hrmvp.xyz/icon.png';

  // Create config once
  _config = getDefaultConfig({
    appName: APP_NAME,
    appDescription: APP_DESCRIPTION,
    appUrl,
    appIcon,
    projectId: WALLETCONNECT_PROJECT_ID,
    chains: SUPPORTED_CHAINS,
    transports,
    ssr: true,
  });

  return _config;
}

// ============================================
// EXPORTS
// ============================================

// Export the config getter (creates on first access)
export const config = getOrCreateConfig();

// Export chain utilities
export function getChainName(chainId: number): string {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  return chain?.name || 'Unknown';
}

export function isSupportedChain(chainId: number): boolean {
  return SUPPORTED_CHAINS.some(c => c.id === chainId);
}

export default config;
