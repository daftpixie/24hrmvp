'use client';

import { useEffect, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface FarcasterProviderProps {
  children: ReactNode;
}

export default function FarcasterProvider({ children }: FarcasterProviderProps) {
  useEffect(() => {
    // Initialize SDK
    const init = async () => {
      try {
        // CRITICAL: Must call ready() after app initialization
        await sdk.actions.ready();
        console.log('✓ Farcaster SDK initialized');
        
        // Get context
        const context = await sdk.context.get();
        console.log('Farcaster context:', context);
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
      }
    };
    
    init();
  }, []);

  return <>{children}</>;
}
