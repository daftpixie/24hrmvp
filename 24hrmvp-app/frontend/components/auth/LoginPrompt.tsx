/**
 * Login Prompt Component
 * 
 * @version 6.0.0
 * 
 * Displays a styled login prompt for protected pages.
 * Uses brand-aligned Liquid Chrome design system.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface LoginPromptProps {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Additional className */
  className?: string;
}

export function LoginPrompt({
  title = 'Authentication Required',
  description = 'Connect your wallet and sign in to access this feature.',
  className = '',
}: LoginPromptProps) {
  const { signIn, isConnecting, error } = useAuth();
  const { isConnected, address } = useAccount();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`max-w-md mx-auto text-center ${className}`}
    >
      <div className="chrome-glass-card p-8">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#04D9FF]/20 to-[#8A00C4]/20 border border-[#04D9FF]/30 flex items-center justify-center">
          <Lock className="w-8 h-8 text-[#04D9FF]" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-display font-bold text-white mb-3">
          {title}
        </h2>

        {/* Description */}
        <p className="text-text-secondary mb-8">
          {description}
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {!isConnected ? (
            // Step 1: Connect Wallet
            <ConnectButton.Custom>
              {({ openConnectModal, mounted }) => {
                return (
                  <button
                    onClick={openConnectModal}
                    disabled={!mounted}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 
                      bg-gradient-to-r from-[#04D9FF] to-[#1F51FF] 
                      rounded-xl font-bold text-black
                      hover:shadow-[0_0_30px_rgba(4,217,255,0.4)] 
                      transition-all duration-300
                      disabled:opacity-50"
                  >
                    <Wallet className="w-5 h-5" />
                    Connect Wallet
                    <ArrowRight className="w-4 h-4" />
                  </button>
                );
              }}
            </ConnectButton.Custom>
          ) : (
            // Step 2: Sign In with Wallet
            <>
              <div className="text-sm text-text-secondary mb-4">
                <span className="text-[#04D9FF] font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                {' '}connected
              </div>
              
              <button
                onClick={signIn}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 
                  bg-gradient-to-r from-[#04D9FF] to-[#1F51FF] 
                  rounded-xl font-bold text-black
                  hover:shadow-[0_0_30px_rgba(4,217,255,0.4)] 
                  transition-all duration-300
                  disabled:opacity-50 disabled:cursor-wait"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Sign In with Wallet
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Security Note */}
        <p className="mt-6 text-xs text-text-tertiary">
          Sign a message to verify ownership. No gas fees required.
        </p>
      </div>
    </motion.div>
  );
}

export default LoginPrompt;
