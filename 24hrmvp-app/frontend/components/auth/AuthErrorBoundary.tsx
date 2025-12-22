/**
 * AuthErrorBoundary - Error boundary for authentication components
 * 
 * Catches runtime errors from wallet SDK initialization (e.g., Family SDK)
 * and provides graceful recovery instead of crashing the app.
 * 
 * @version 6.0.0
 * @brand 24HRMVP Liquid Chrome Design System
 */

'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a recoverable wallet error
    const isWalletError = 
      error.message?.includes('Family Accounts is not connected') ||
      error.message?.includes('WalletConnect') ||
      error.message?.includes('wagmi');
    
    if (isWalletError) {
      console.warn('[AuthErrorBoundary] Caught wallet SDK error, will attempt recovery');
      return { 
        hasError: true, 
        error,
        errorInfo: 'Wallet connection interrupted. Attempting to recover...'
      };
    }

    return { 
      hasError: true, 
      error,
      errorInfo: error.message 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AuthErrorBoundary] Error caught:', error);
    console.error('[AuthErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // Check if this is a recoverable error
    const isRecoverable = 
      error.message?.includes('Family Accounts') ||
      error.message?.includes('WalletConnect');
    
    if (isRecoverable) {
      // Attempt recovery after a short delay
      setTimeout(() => {
        this.setState({ hasError: false, error: null, errorInfo: '' });
      }, 1500);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  render() {
    if (this.state.hasError) {
      // Check if custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with brand styling
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1E1E1E] border border-white/10 rounded-xl p-6 text-center">
            {/* Icon */}
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#FF5C00]/10 flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-[#FF5C00]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-[#FAFAFA] mb-2">
              Connection Interrupted
            </h3>

            {/* Message */}
            <p className="text-sm text-[#808080] mb-4">
              {this.state.errorInfo || 'The wallet connection encountered an issue. This usually resolves automatically.'}
            </p>

            {/* Retry Button */}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-[#04D9FF]/10 border border-[#04D9FF] text-[#04D9FF] 
                         rounded-lg text-sm font-medium hover:bg-[#04D9FF]/20 
                         transition-colors duration-200"
            >
              Try Again
            </button>

            {/* Loading indicator if auto-recovering */}
            {this.state.error?.message?.includes('Family Accounts') && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#808080]">
                <div className="w-3 h-3 border-2 border-[#04D9FF]/30 border-t-[#04D9FF] rounded-full animate-spin" />
                Auto-recovering...
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;
