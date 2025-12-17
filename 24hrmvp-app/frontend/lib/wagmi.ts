/**
 * Wagmi Configuration for 24HRMVP
 * @version 4.5.0
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base, polygon, arbitrum, optimism } from 'wagmi/chains';
import { http, type Config } from 'wagmi';

export const SUPPORTED_CHAINS = [
  mainnet,
  base,
  polygon,
  arbitrum,
  optimism,
] as const;

const transports = {
  [mainnet.id]: http(),
  [base.id]: http(),
  [polygon.id]: http(),
  [arbitrum.id]: http(),
  [optimism.id]: http(),
};

const APP_NAME = '24HRMVP';
const APP_DESCRIPTION = 'Community-driven 24-hour MVP development platform';
const APP_ICON = 'https://24hrmvp.xyz/icon.png';
const WALLETCONNECT_PROJECT_ID = '5ac1003d6254111216201e5042cb4675';

function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://24hrmvp.xyz';
}

declare global {
  var __wagmiConfig: Config | undefined;
}

function getOrCreateConfig(): Config {
  if (globalThis.__wagmiConfig) {
    return globalThis.__wagmiConfig;
  }

  const appUrl = getAppUrl();

  globalThis.__wagmiConfig = getDefaultConfig({
    appName: APP_NAME,
    appDescription: APP_DESCRIPTION,
    appUrl: appUrl,
    appIcon: APP_ICON,
    projectId: WALLETCONNECT_PROJECT_ID,
    chains: SUPPORTED_CHAINS,
    transports,
    ssr: true,
  });

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[wagmi] Config v4.5.0', { appUrl });
  }

  return globalThis.__wagmiConfig;
}

export const config = getOrCreateConfig();
export default config;
