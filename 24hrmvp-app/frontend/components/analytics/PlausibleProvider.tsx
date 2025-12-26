/**
 * 24HRMVP Main Platform - Plausible Analytics Provider
 * 
 * File: frontend/components/analytics/PlausibleProvider.tsx
 * 
 * Self-hosted Plausible at analytics.24hrmvp.xyz
 */

import PlausibleProvider from 'next-plausible';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PLAUSIBLE_CONFIG = {
  domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || '24hrmvp.xyz',
  customDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || 'https://analytics.24hrmvp.xyz',
  trackOutboundLinks: true,
  trackFileDownloads: true,
  enabled: process.env.NODE_ENV === 'production' || 
           process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
};

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Single-domain Plausible Analytics provider
 */
export function PlausibleAnalytics() {
  return (
    <PlausibleProvider
      domain={PLAUSIBLE_CONFIG.domain}
      customDomain={PLAUSIBLE_CONFIG.customDomain}
      selfHosted={true}
      trackOutboundLinks={PLAUSIBLE_CONFIG.trackOutboundLinks}
      trackFileDownloads={PLAUSIBLE_CONFIG.trackFileDownloads}
      enabled={PLAUSIBLE_CONFIG.enabled}
    />
  );
}

/**
 * Multi-domain Plausible Analytics provider
 * Tracks to both site-specific and aggregate dashboards
 */
export function PlausibleMultiDomain({ 
  domains = ['24hrmvp.xyz', 'all.24hrmvp.xyz'] 
}: { 
  domains?: string[] 
}) {
  const multiDomain = domains.join(',');
  
  return (
    <PlausibleProvider
      domain={multiDomain}
      customDomain={PLAUSIBLE_CONFIG.customDomain}
      selfHosted={true}
      trackOutboundLinks={PLAUSIBLE_CONFIG.trackOutboundLinks}
      trackFileDownloads={PLAUSIBLE_CONFIG.trackFileDownloads}
      enabled={PLAUSIBLE_CONFIG.enabled}
    />
  );
}

/**
 * Development-enabled Plausible provider (for testing only)
 */
export function PlausibleDev() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[PlausibleDev] Should not be used in production!');
  }
  
  return (
    <PlausibleProvider
      domain={PLAUSIBLE_CONFIG.domain}
      customDomain={PLAUSIBLE_CONFIG.customDomain}
      selfHosted={true}
      trackOutboundLinks={true}
      trackFileDownloads={true}
      enabled={true}
    />
  );
}

// Dashboard links for reference
export const ANALYTICS_DASHBOARDS = {
  main: 'https://analytics.24hrmvp.xyz/24hrmvp.xyz',
  launch: 'https://analytics.24hrmvp.xyz/launch.24hrmvp.xyz',
  punks: 'https://analytics.24hrmvp.xyz/punks.24hrmvp.xyz',
  aggregate: 'https://analytics.24hrmvp.xyz/all.24hrmvp.xyz',
} as const;

export default PlausibleAnalytics;
