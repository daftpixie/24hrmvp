import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@farcaster/quick-auth';

// Define the fallback cookie options since we removed createSessionCookie
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 Days
};

/**
 * Farcaster Quick Auth Verification Route
 * Verifies Farcaster JWT and delegates session creation to Backend
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 400 }
      );
    }
    
    // 1. Verify JWT using Farcaster Quick Auth (Client-side check optional but good for speed)
    const client = createClient();
    const payload = await client.verifyJwt({
      token,
      domain: process.env.NEXT_PUBLIC_DOMAIN || '24hrmvp.xyz',
    });
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // 2. Call Backend API to Create Session/User
    // The backend's /api/auth/verify endpoint handles the upsert logic
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
    
    // We construct a temporary user object to send to the backend for verification
    const farcasterPayload = payload as typeof payload & {
      username?: string;
      displayName?: string;
      pfpUrl?: string;
    };

    // Ensure FID is handled safely
    const fidString = String(payload.sub);

    const backendResponse = await fetch(`${backendUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Pass a secret header if you want to secure this server-to-server call
        'X-Internal-Request': 'true', 
      },
      body: JSON.stringify({ 
        user: {
          id: fidString, // Using FID as ID or mapping it
          fid: parseInt(fidString, 10),
          username: farcasterPayload.username,
          displayName: farcasterPayload.displayName,
          pfpUrl: farcasterPayload.pfpUrl,
          authSource: 'farcaster'
        }
      }),
    });
    
    if (!backendResponse.ok) {
      throw new Error('Backend verification failed');
    }
    
    const { user, token: backendToken } = await backendResponse.json();
    
    // 3. Set Session Cookie
    // Use the token returned by backend (or the farcaster token if backend allows it)
    // For now, if backend doesn't return a token, we can use the Farcaster token as session 
    // (Provided the backend middleware can verify it)
    const sessionToken = backendToken || token;

    const response = NextResponse.json({ 
      user, 
      isNewUser: false, // Backend handles this
      session: {
        token: sessionToken,
      },
    });
    
    // Set cookie using native Next.js API since we removed the helper
    response.cookies.set('session', sessionToken, COOKIE_OPTIONS);
    
    return response;
    
  } catch (error) {
    console.error('Farcaster verification error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
