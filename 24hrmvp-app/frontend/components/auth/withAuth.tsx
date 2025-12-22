/**
 * Protected Page Wrapper
 * 
 * @version 6.0.0
 * 
 * HOC (Higher Order Component) that wraps pages requiring authentication.
 * Shows login prompt if not authenticated.
 * 
 * Usage:
 * ```tsx
 * import { withAuth } from '@/components/auth/withAuth';
 * 
 * function MyProtectedPage() {
 *   const { user } = useAuth();
 *   return <div>Hello {user?.username}!</div>;
 * }
 * 
 * export default withAuth(MyProtectedPage);
 * ```
 */

'use client';

import React, { ComponentType } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { LoginPrompt } from './LoginPrompt';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export interface WithAuthOptions {
  /** Title for login prompt */
  loginTitle?: string;
  /** Description for login prompt */
  loginDescription?: string;
  /** Show loading skeleton while checking auth */
  loadingComponent?: React.ReactNode;
}

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    loginTitle = 'Sign In Required',
    loginDescription = 'Please sign in to access this page.',
    loadingComponent = <LoadingSkeleton />,
  } = options;

  function WithAuthComponent(props: P) {
    const { isAuthenticated, isLoading, showPrompt } = useRequireAuth({
      showLoginPrompt: true,
    });

    // Show loading state
    if (isLoading) {
      return <>{loadingComponent}</>;
    }

    // Show login prompt
    if (showPrompt || !isAuthenticated) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center py-12 px-4">
          <LoginPrompt title={loginTitle} description={loginDescription} />
        </div>
      );
    }

    // Render the wrapped component
    return <WrappedComponent {...props} />;
  }

  WithAuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithAuthComponent;
}

export default withAuth;
