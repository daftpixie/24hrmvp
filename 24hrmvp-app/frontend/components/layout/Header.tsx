'use client';

/**
 * Header Component - Main Navigation Header for 24HRMVP
 * 
 * Features dynamic navigation that shows Profile link only when authenticated.
 * Uses the Liquid Chrome Futuristic Design System with Tron-inspired aesthetics.
 * 
 * @version 2.1.0 - Added 'use client' directive for Next.js App Router compatibility
 * @brand 24HRMVP Liquid Chrome Design System
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthButton from '@/components/wallet/AuthButton';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Navigation link configuration
 * Extends based on authentication state
 */
const baseNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/submit', label: 'Submit' },
  { href: '/vote', label: 'Vote' },
  { href: '/grid', label: 'The Grid' },
];

/**
 * Header Component with Dynamic Navigation
 * 
 * Implements:
 * - Sticky header with glassmorphism backdrop blur
 * - Active state highlighting per brand guidelines
 * - Responsive layout (nav hidden on mobile, shown on md+)
 * - Authentication-aware navigation
 */
export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  // Build navigation links based on auth state
  const navLinks = isAuthenticated
    ? [...baseNavLinks, { href: `/profile/${user?.id || ''}`, label: 'Profile' }]
    : baseNavLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B192A]/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo - Chrome gradient text effect */}
        <Link 
          href="/" 
          className="flex items-center space-x-2 transition-transform hover:scale-105"
        >
          <div className="chrome-text text-2xl font-black tracking-tight">
            24HR<span className="text-[#04D9FF]">MVP</span>
          </div>
        </Link>

        {/* Navigation - Hidden on mobile, flex on md+ */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || 
              (link.href !== '/' && pathname.startsWith(link.href));
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  nav-link relative px-3 py-2 text-sm font-medium
                  transition-all duration-200 ease-out
                  ${isActive 
                    ? 'text-[#04D9FF]' 
                    : 'text-gray-300 hover:text-[#04D9FF]'
                  }
                `}
              >
                {link.label}
                {/* Active indicator line */}
                {isActive && (
                  <span 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 
                               bg-[#04D9FF] shadow-[0_0_10px_#04D9FF]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth Button - Always visible */}
        <div className="flex items-center">
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
