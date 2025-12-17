import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from 'siwe';

// ============================================
// SIWE NONCE ENDPOINT
// Generates cryptographic nonces for SIWE authentication
// ============================================

// Nonce expiry time (10 minutes)
const NONCE_EXPIRY_MS = 10 * 60 * 1000;

/**
 * GET /api/auth/siwe/nonce
 * Simple nonce generation (for direct requests)
 */
export async function GET() {
  try {
    const nonce = generateNonce();
    
    return new NextResponse(nonce, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Nonce generation error (GET):', error);
    return new NextResponse('Failed to generate nonce', { status: 500 });
  }
}

/**
 * POST /api/auth/siwe/nonce
 * Nonce generation with address/chainId (matches wallet-auth.ts client)
 * 
 * Request body (optional):
 * {
 *   address?: string,
 *   chainId?: number
 * }
 * 
 * Response:
 * {
 *   nonce: string,
 *   message: string,
 *   expiresAt: string (ISO)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse body (optional - SIWE nonces don't need to be address-specific)
    let body: { address?: string; chainId?: number } = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional, continue without it
    }

    // Generate cryptographically secure nonce
    const nonce = generateNonce();
    
    // Calculate expiration
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS);

    // Log for debugging (optional)
    if (body.address) {
      console.log(`[SIWE] Nonce generated for ${body.address} on chain ${body.chainId || 'default'}`);
    }

    // Return in format expected by NonceResponse interface in wallet-auth.ts
    return NextResponse.json({
      nonce,
      message: 'Nonce generated successfully',
      expiresAt: expiresAt.toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
    
  } catch (error) {
    console.error('Nonce generation error (POST):', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}

// Ensure OPTIONS is handled for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
