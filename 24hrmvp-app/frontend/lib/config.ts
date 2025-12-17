// ============================================
// 24HRMVP - CENTRALIZED CONFIGURATION
// File: frontend/lib/config.ts
// Single source of truth for all URLs and config
// 
// CRITICAL: This file must NEVER return undefined for API_URL
// ============================================

// Hardcoded production URL - NEVER undefined
const PRODUCTION_API_URL = 'https://api.24hrmvp.xyz';
const PRODUCTION_WS_URL = 'wss://api.24hrmvp.xyz';
const PRODUCTION_APP_URL = 'https://24hrmvp.xyz';

/**
 * Get the API URL with bulletproof fallback logic
 * CRITICAL: Next.js bakes NEXT_PUBLIC_* vars at BUILD time, not runtime
 * This function MUST always return a valid URL string, never undefined
 */
export function getApiUrl(): string {
  // 1. Try environment variable first
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl !== 'undefined' && envUrl.startsWith('http')) {
    return envUrl;
  }
  
  // 2. Check if we're in browser and determine URL from hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // Production - always use hardcoded URL
    return PRODUCTION_API_URL;
  }
  
  // 3. Server-side or fallback - always production
  return PRODUCTION_API_URL;
}

/**
 * Get the WebSocket URL with bulletproof fallback
 */
export function getWsUrl(): string {
  // 1. Try environment variable first
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl && envUrl !== 'undefined' && (envUrl.startsWith('ws://') || envUrl.startsWith('wss://'))) {
    return envUrl;
  }
  
  // 2. Check if we're in browser and determine URL from hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'ws://localhost:3001';
    }
    
    // Production
    return PRODUCTION_WS_URL;
  }
  
  // 3. Server-side or fallback
  return PRODUCTION_WS_URL;
}

/**
 * Get the app URL (frontend) with bulletproof fallback
 */
export function getAppUrl(): string {
  // 1. Try environment variable first
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl !== 'undefined' && envUrl.startsWith('http')) {
    return envUrl;
  }
  
  // 2. Check if we're in browser - use current origin
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return window.location.origin;
    }
    
    // Production
    return PRODUCTION_APP_URL;
  }
  
  // 3. Server-side or fallback
  return PRODUCTION_APP_URL;
}

// ============================================
// COMPUTED CONSTANTS
// These are computed at module load time
// For client components, prefer using the functions directly
// ============================================

// Use functions to ensure values are never undefined
export const API_URL = getApiUrl();
export const WS_URL = getWsUrl();
export const APP_URL = getAppUrl();

// ============================================
// DEBUG LOGGING (Development only)
// ============================================
if (typeof window !== 'undefined') {
  // Log on first load to help debug issues
  const debugInfo = {
    API_URL: getApiUrl(),
    WS_URL: getWsUrl(),
    APP_URL: getAppUrl(),
    env_API: process.env.NEXT_PUBLIC_API_URL || '(not set)',
    hostname: window.location.hostname,
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Config] URLs:', debugInfo);
  }
  
  // Warn if API_URL looks wrong
  const apiUrl = getApiUrl();
  if (!apiUrl || apiUrl === 'undefined' || !apiUrl.startsWith('http')) {
    console.error('[Config] CRITICAL: Invalid API_URL detected:', apiUrl);
  }
}

// ============================================
// EXPORT HELPERS
// ============================================

/**
 * Build a full API URL from a path
 * @param path - API path (e.g., '/api/ideas')
 * @returns Full URL (e.g., 'https://api.24hrmvp.xyz/api/ideas')
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export default {
  getApiUrl,
  getWsUrl,
  getAppUrl,
  buildApiUrl,
  API_URL,
  WS_URL,
  APP_URL,
};
