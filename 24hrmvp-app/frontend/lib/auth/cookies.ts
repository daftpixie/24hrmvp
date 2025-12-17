// ============================================
// 24HRMVP - COOKIE MANAGEMENT
// File: frontend/lib/auth/cookies.ts
// Session cookie configuration and helpers
// ============================================

import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// Cookie configuration
const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || '604800', 10); // 7 days

/**
 * Cookie options for session
 * Same-origin so we can use 'lax' instead of 'none'
 */
export function getSessionCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Same-origin - no need for 'none'
    maxAge: SESSION_MAX_AGE,
    path: '/',
  };
}

/**
 * Set session cookie (server-side)
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

/**
 * Get session cookie value (server-side)
 */
export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Delete session cookie (server-side)
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if session cookie exists
 */
export async function hasSessionCookie(): Promise<boolean> {
  const token = await getSessionCookie();
  return !!token;
}

/**
 * Export cookie name for client-side use
 */
export const COOKIE_NAME = SESSION_COOKIE_NAME;
