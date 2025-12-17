'use client';

/**
 * Authentication Button Component
 * 
 * @version 4.4.0 - ASCII-only comments
 */

import React, { useState, useRef, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/providers/AuthProvider';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, User, LayoutGrid, Wallet, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthButton() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // AUTHENTICATED STATE
  if (isAuthenticated && user) {
    const truncatedAddress = user.walletAddress
      ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
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
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#2E2E2E] border border-white/10">
            {user.pfpUrl ? (
              <img
                src={user.pfpUrl}
                alt={user.username}
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
          </div>

          <div className="flex flex-col items-start">
            <span className="text-xs font-bold text-[#FAFAFA] leading-none mb-0.5">
              {user.displayName || user.username}
            </span>
            <span className="text-[10px] text-[#808080] font-mono">
              {truncatedAddress}
            </span>
          </div>

          <ChevronDown
            className={`w-3 h-3 text-[#808080] transition-transform ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        </motion.button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-48 py-1 rounded-xl 
                bg-[#1A1A1A] border border-white/10 shadow-xl backdrop-blur-xl z-50 overflow-hidden"
            >
              <div className="p-1">
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

              <div className="border-t border-white/5 p-1 mt-1">
                <button
                  onClick={async () => {
                    await logout();
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

  // LOADING SIWE STATE
  if (isConnected && address && isLoading) {
    return (
      <motion.button
        disabled
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm
          bg-[#1E1E1E] border border-[#04D9FF]/30 text-[#04D9FF]/70
          cursor-wait"
      >
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>SIGNING IN...</span>
      </motion.button>
    );
  }

  // NEEDS SIWE SIGNATURE STATE
  if (isConnected && address && !isAuthenticated && !isLoading) {
    const truncatedAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={login}
        className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm
          bg-[#1E1E1E] border border-yellow-500/50 text-yellow-400
          hover:bg-yellow-500/10 transition-all"
      >
        <AlertCircle className="w-4 h-4" />
        <span>{truncatedAddr}</span>
        <span className="text-xs opacity-70">(Sign In)</span>
      </motion.button>
    );
  }

  // NOT CONNECTED STATE
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
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
              if (!connected) {
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
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#04D9FF] to-[#1F51FF] opacity-20 blur-xl" />
                    </div>

                    <span className="relative flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      <span>CONNECT WALLET</span>
                    </span>
                  </motion.button>
                );
              }

              if (chain.unsupported) {
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

              return (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openAccountModal}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm
                    bg-[#1E1E1E] border border-[#04D9FF]/30 text-[#04D9FF]
                    hover:border-[#04D9FF]/50 transition-all"
                >
                  <Wallet className="w-4 h-4" />
                  {account.displayName}
                </motion.button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
