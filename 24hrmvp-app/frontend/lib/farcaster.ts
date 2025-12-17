// ============================================
// 24HRMVP - FARCASTER SDK WRAPPER
// File: frontend/lib/farcaster.ts
// Safe wrapper that handles browser vs Warpcast context
// ============================================

type SDK = typeof import('@farcaster/miniapp-sdk').sdk;

let cachedSdk: SDK | null = null;
let contextChecked = false;
let isInFarcaster = false;

/**
 * Check if we're running inside Farcaster (Warpcast)
 * This is cached after first check
 */
export async function checkFarcasterContext(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (contextChecked) return isInFarcaster;
  
  try {
    const module = await import('@farcaster/miniapp-sdk');
    const sdk = module.sdk;
    
    // Try to get context with a short timeout
    const context = await Promise.race([
      sdk.context,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
    ]);
    
    isInFarcaster = !!(context && typeof context === 'object' && 'user' in context);
    contextChecked = true;
    
    console.log(`Farcaster context check: ${isInFarcaster ? 'IN WARPCAST' : 'IN BROWSER'}`);
    return isInFarcaster;
  } catch (err) {
    console.log('Not in Farcaster context (SDK error)');
    contextChecked = true;
    isInFarcaster = false;
    return false;
  }
}

/**
 * Get the Farcaster SDK (only if in Farcaster context)
 * Returns null if not in Farcaster
 */
export async function getFarcasterSdk(): Promise<SDK | null> {
  if (typeof window === 'undefined') return null;
  
  const inFarcaster = await checkFarcasterContext();
  if (!inFarcaster) return null;
  
  if (!cachedSdk) {
    const module = await import('@farcaster/miniapp-sdk');
    cachedSdk = module.sdk;
  }
  
  return cachedSdk;
}

/**
 * Safe Quick Auth fetch - only works in Farcaster context
 */
export async function quickAuthFetch(
  url: string, 
  options?: RequestInit
): Promise<Response | null> {
  const sdk = await getFarcasterSdk();
  if (!sdk) {
    console.log('quickAuthFetch: Not in Farcaster context, skipping');
    return null;
  }
  
  try {
    return await sdk.quickAuth.fetch(url, options);
  } catch (err) {
    console.error('quickAuthFetch error:', err);
    return null;
  }
}

/**
 * Call sdk.actions.ready() safely
 */
export async function signalReady(): Promise<void> {
  const sdk = await getFarcasterSdk();
  if (!sdk) return;
  
  try {
    await sdk.actions.ready();
  } catch (err) {
    console.warn('sdk.actions.ready() failed:', err);
  }
}

/**
 * Get Farcaster context safely
 */
export async function getContext(): Promise<any | null> {
  const sdk = await getFarcasterSdk();
  if (!sdk) return null;
  
  try {
    return await sdk.context;
  } catch (err) {
    console.error('getContext error:', err);
    return null;
  }
}

export { isInFarcaster as isInFarcasterContext };