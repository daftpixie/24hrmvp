import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, signature, address } = body;

    // 1. Call Backend API to verify signature and get User/Token
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
    
    const backendResponse = await fetch(`${backendUrl}/api/auth/siwe/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, signature, address }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || 'Backend verification failed' }, 
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    const { user, tokens, isNewUser } = data;

    // 2. Set Session Cookie (HTTP-Only)
    // We use the access token provided by the backend as the session cookie
    const cookieStore = cookies();
    
    // Calculate expiration based on backend token or default (e.g., 7 days)
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    cookieStore.set('session', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expires,
    });

    // 3. Return User Data to Client (Cookie is set in headers)
    return NextResponse.json({
      success: true,
      user,
      isNewUser,
    });

  } catch (error) {
    console.error('BFF Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal connection failed' }, 
      { status: 500 }
    );
  }
}
