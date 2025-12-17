'use client';

/**
 * PostHog Provider Component
 * 
 * Wraps the application with PostHog analytics context.
 * Handles initialization and page view tracking.
 * 
 * Usage in app/layout.tsx:
 * ```tsx
 * import { PostHogProvider } from '@/components/PostHogProvider';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <PostHogProvider>{children}</PostHogProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, trackPageView, posthog } from '@/lib/posthog';

interface PostHogProviderProps {
  children: React.ReactNode;
}

/**
 * Page view tracker component
 * Tracks navigation events in the app
 */
function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      trackPageView(url);
    }
  }, [pathname, searchParams]);
  
  return null;
}

/**
 * PostHog Provider
 * 
 * Initializes PostHog and provides page view tracking.
 * Safe to use even if PostHog is not configured (no-ops in that case).
 */
export function PostHogProvider({ children }: PostHogProviderProps): JSX.Element {
  useEffect(() => {
    // Initialize PostHog on mount
    initPostHog();
    
    // Cleanup on unmount (optional)
    return () => {
      // PostHog persists across page navigations by default
      // Uncomment if you want to flush on unmount:
      // posthog.capture('$pageleave');
    };
  }, []);
  
  return (
    <>
      <PostHogPageView />
      {children}
    </>
  );
}

export default PostHogProvider;
