import { NextRequest, NextResponse } from 'next/server';

// ============================================
// SESSION CHECK ENDPOINT
//
// This is an OPTIONAL Next.js BFF route that provides a clean
// session check without requiring authentication.
//
// If using direct backend calls, this route is not needed.
// ============================================

// FIXED: Removed newline inside the string literal
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';

/**
 * GET /api/auth/session
 *
 * Check if user has a valid session.
 * Returns 200 with authenticated: false if no session (not 401).
 * This prevents console errors for normal unauthenticated states.
 */
export async function GET(req: NextRequest) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies.get('access_token')?.value;

    // No token = not authenticated (not an error)
    if (!token) {
      return NextResponse.json({
        authenticated: false,
        session: null,
        user: null,
      }, {
        status: 200, // Not 401!
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // Proxy to backend with token
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    // Backend 401 = token invalid/expired
    if (backendResponse.status === 401) {
      // Clear the invalid cookie if it exists
      const response = NextResponse.json({
        authenticated: false,
        session: null,
        user: null,
      }, { status: 200 });
      response.cookies.delete('access_token');
      return response;
    }

    if (!backendResponse.ok) {
      console.warn('Backend session check failed:', backendResponse.status);
      return NextResponse.json({
        authenticated: false,
        session: null,
        user: null,
      }, { status: 200 });
    }

    const data = await backendResponse.json();

    // Transform backend response to expected format
    // Backend returns: { success: true, user: {...} }
    // Frontend expects: { authenticated: true, session: {...}, user: {...} }
    if (data.success && data.user) {
      return NextResponse.json({
        authenticated: true,
        session: {
          userId: data.user.id,
          walletAddress: data.user.walletAddress || data.user.primaryWalletAddress,
          authSource: data.user.authSource,
        },
        user: data.user,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // Backend returned success but no user
    return NextResponse.json({
      authenticated: false,
      session: null,
      user: null,
    }, { status: 200 });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      authenticated: false,
      session: null,
      user: null,
      error: 'Session check failed',
    }, { status: 200 }); // Still 200 - not an error condition
  }
}

/**
 * DELETE /api/auth/session
 * Clear session (logout)
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies.get('access_token')?.value;

    // Notify backend (best effort)
    if (token) {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }).catch(() => {});
    }

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: 'Session cleared',
    });
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Logout failed',
    }, { status: 500 });
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
