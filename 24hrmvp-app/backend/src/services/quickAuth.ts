import { createClient } from '@farcaster/quick-auth';

const quickAuthClient = createClient();

interface QuickAuthPayload {
  sub: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  custody?: string;
  verifications?: string[];
}

export async function verifyQuickAuthJWT(token: string) {
  try {
    const payload = await quickAuthClient.verifyJwt({
      token,
      domain: process.env.QUICK_AUTH_DOMAIN || 'localhost',
    }) as unknown as QuickAuthPayload;

    return {
      success: true,
      payload: {
        fid: parseInt(payload.sub, 10),
        username: payload.username || 'anonymous',
        displayName: payload.displayName || undefined,
        pfpUrl: payload.pfpUrl || undefined,
        custody: payload.custody || undefined,
        verifications: payload.verifications || [],
      },
    };
  } catch (error) {
    console.error('Quick Auth verification failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
      payload: undefined,
    };
  }
}

export default quickAuthClient;
