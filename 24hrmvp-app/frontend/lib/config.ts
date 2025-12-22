// ============================================
// 24HRMVP - CLIENT CONFIGURATION
// File: frontend/lib/config.ts
// Centralized configuration for API and WebSocket URLs
// ============================================

/**
 * Get the API base URL
 * Uses NEXT_PUBLIC_API_URL environment variable in production
 * Falls back to localhost for development
 */
export function getApiUrl(): string {
  // In browser, check for the public env var
  if (typeof window !== 'undefined') {
    // Try NEXT_PUBLIC_API_URL first (set at build time)
    const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicApiUrl) {
      return publicApiUrl;
    }
    
    // Fallback: If running on production domain, use production API
    if (window.location.hostname === '24hrmvp.xyz' || 
        window.location.hostname === 'www.24hrmvp.xyz') {
      return 'https://api.24hrmvp.xyz';
    }
    
    // Development fallback
    return 'http://localhost:3001';
  }
  
  // Server-side fallback
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

/**
 * Get the WebSocket URL
 * Uses NEXT_PUBLIC_WS_URL environment variable in production
 * Falls back to localhost for development
 */
export function getWsUrl(): string {
  // In browser, check for the public env var
  if (typeof window !== 'undefined') {
    // Try NEXT_PUBLIC_WS_URL first (set at build time)
    const publicWsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (publicWsUrl) {
      return publicWsUrl;
    }
    
    // Fallback: If running on production domain, use production WebSocket
    if (window.location.hostname === '24hrmvp.xyz' || 
        window.location.hostname === 'www.24hrmvp.xyz') {
      return 'wss://api.24hrmvp.xyz';
    }
    
    // Development fallback
    return 'http://localhost:3001';
  }
  
  // Server-side fallback
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get environment-specific configuration
 */
export const config = {
  api: {
    baseUrl: getApiUrl,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },
  ws: {
    url: getWsUrl,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    reconnectDelayMax: 30000,
  },
  features: {
    chat: true,
    forum: true,
    livestream: false, // Not yet implemented
    social: true,
  },
} as const;

export default config;
