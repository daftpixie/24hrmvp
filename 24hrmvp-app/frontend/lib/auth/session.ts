import { cookies } from 'next/headers';
import { jwtVerify } from 'jose'; 

// NOTE: This secret must match the BACKEND's JWT_SECRET exactly
// If you cannot guarantee they match, do not verify signature locally.
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  userId: string;
  fid?: number;
  walletAddress?: string;
  authMethod: 'farcaster' | 'ethereum' | 'solana';
  [key: string]: any;
}

/**
 * Get current session from cookies
 * Tries to verify the JWT locally for fast SSR access.
 * If verification fails, returns null.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
      return null;
    }

    // Verify token integrity
    // Ideally, we just pass this token to the backend, but for 
    // middleware/layout performance we verify locally.
    const { payload } = await jwtVerify(sessionCookie.value, secretKey, {
        algorithms: ['HS256'] // Ensure this matches Backend algorithm
    });
    
    return payload as unknown as SessionPayload;

  } catch (error) {
    // Token expired or invalid signature
    return null;
  }
}

/**
 * Helper to create cookie options standard
 * Used when setting cookies in API routes
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 Days
  };
}

/**
 * Create a session cookie configuration object
 * @deprecated Use getCookieOptions instead
 */
export function createSessionCookie(token: string) {
  return {
    name: 'session',
    value: token,
    ...getCookieOptions()
  };
}
