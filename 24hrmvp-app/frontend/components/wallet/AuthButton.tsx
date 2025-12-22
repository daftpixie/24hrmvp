/**
 * Authentication Button Component
 * 
 * @version 6.0.0 - Unified auth flow with SIWE
 * 
 * This component handles three states:
 * 1. Not connected - Shows "Connect Wallet" button
 * 2. Connected but not signed in - Shows "Sign In" button
 * 3. Signed in - Shows user avatar with dropdown
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, User, LayoutGrid, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthButton() {
  const { user, isAuthenticated, isLoading, isConnecting, signIn, signOut, error } = useAuth();
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="w-[140px] h-10 bg-[#1E1E1E]/50 rounded-lg animate-pulse" />
    );
  }

  // ============================================
  // STATE 3: AUTHENTICATED - Show User Profile
  // ============================================
  if (isAuthenticated && user) {
    const displayAddress = user.walletAddress || user.custodyAddress;
    const truncatedAddress = displayAddress
      ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
      : user.username;

    const profilePath = `/profile/${user.id}`;

    return (
      <div className="relative" ref={dropdownRef}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full 
            bg-[#1E1E1E] border border-[#04D9FF]/20 
            hover:border-[#04D9FF]/50 transition-all duration-200 group"
        >
          {/* Avatar */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#2E2E2E] border border-white/10">
            {user.pfpUrl ? (
              <img
                src={user.pfpUrl}
                alt={user.username || 'User'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#04D9FF]/20 to-[#8A00C4]/20">
                <span className="text-xs font-bold text-[#04D9FF]">
                  {user.username?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1E1E1E]" />
          </div>

          {/* User Info */}
          <div className="flex flex-col items-start max-w-[100px]">
            <span className="text-xs font-bold text-[#FAFAFA] leading-none mb-0.5 truncate w-full">
              {user.displayName || user.username}
            </span>
            <span className="text-[10px] text-[#808080] font-mono truncate w-full">
              {truncatedAddress}
            </span>
          </div>

          {/* Dropdown Arrow */}
          <ChevronDown
            className={`w-3 h-3 text-[#808080] transition-transform ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 py-1 rounded-xl 
                bg-[#1A1A1A] border border-white/10 shadow-xl backdrop-blur-xl z-50 overflow-hidden"
            >
              <div className="p-1">
                {/* Profile Link */}
                <button
                  onClick={() => {
                    router.push(profilePath);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm 
                    text-[#FAFAFA] hover:bg-white/5 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 text-[#8A00C4]" />
                  Profile
                </button>

                {/* The Grid Link */}
                <button
                  onClick={() => {
                    router.push('/grid');
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm 
                    text-[#FAFAFA] hover:bg-white/5 rounded-lg transition-colors"
                >
                  <LayoutGrid className="w-4 h-4 text-[#1F51FF]" />
                  The Grid
                </button>
              </div>

              {/* Disconnect Button */}
              <div className="border-t border-white/5 p-1 mt-1">
                <button
                  onClick={async () => {
                    await signOut();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm 
                    text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================
  // STATE 2: CONNECTED BUT NOT SIGNED IN
  // ============================================
  if (isConnected && address && !isLoading) {
    const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={signIn}
        disabled={isConnecting}
        className={`relative overflow-hidden group px-4 py-2 rounded-lg 
          font-bold text-sm tracking-wide transition-all duration-300
          ${isConnecting 
            ? 'bg-[#1E1E1E] border border-[#04D9FF]/30 text-[#04D9FF]/70 cursor-wait'
            : 'bg-gradient-to-r from-[#04D9FF]/10 to-[#1F51FF]/10 border border-[#04D9FF] text-[#04D9FF] hover:shadow-[0_0_15px_rgba(4,217,255,0.3)]'
          }`}
      >
        {isConnecting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            SIGNING IN...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span>SIGN IN</span>
            <span className="text-[10px] opacity-70 font-mono">({truncatedAddress})</span>
          </span>
        )}
      </motion.button>
    );
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm
        bg-[#1E1E1E] border border-[#04D9FF]/30 text-[#04D9FF]/70">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  // ============================================
  // STATE 1: NOT CONNECTED - Show Connect Button
  // ============================================
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted: rkMounted,
      }) => {
        const ready = rkMounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              // Wrong network
              if (connected && chain?.unsupported) {
                return (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={openChainModal}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm
                      bg-red-500/10 border border-red-500/50 text-red-400
                      hover:bg-red-500/20 transition-all"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Wrong Network
                  </motion.button>
                );
              }

              // Not connected - show connect button
              return (
                <motion.button
                  whileHover={{ 
                    scale: 1.02, 
                    boxShadow: '0 0 15px rgba(4, 217, 255, 0.3)' 
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openConnectModal}
                  className="relative overflow-hidden group px-4 py-2 rounded-lg 
                    font-bold text-sm tracking-wide
                    bg-transparent border border-[#04D9FF] text-[#04D9FF]
                    shadow-[0_0_8px_rgba(4,217,255,0.1)] hover:bg-[#04D9FF]/10
                    transition-all duration-300"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#04D9FF] to-[#1F51FF] opacity-20 blur-xl" />
                  </div>

                  <span className="relative flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    <span>CONNECT WALLET</span>
                  </span>
                </motion.button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

// Named export for tree-shaking
export { AuthButton };
