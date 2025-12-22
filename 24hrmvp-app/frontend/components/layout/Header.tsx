'use client';

/**
 * Header Component - Main Navigation Header for 24HRMVP
 * 
 * Features dynamic navigation that shows Profile link only when authenticated.
 * Uses the Liquid Chrome Futuristic Design System with Tron-inspired aesthetics.
 * 
 * @version 2.3.0 - Brand alignment: Logo equality & Uppercase Bold Orbitron Menu
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
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B192A]/90 backdrop-blur-xl transition-all duration-300">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-1 group">
          <div className="relative flex items-center font-display font-black text-2xl tracking-tighter">
            <span className="bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent group-hover:text-white transition-colors">
              24HR
            </span>
            <span className="text-neon-cyan group-hover:text-neon-cyan/80 transition-colors shadow-neon-glow ml-0.5">
              MVP
            </span>
            
            {/* Animated Underline on Hover */}
            <div className="absolute -bottom-2 left-0 w-0 h-[2px] bg-neon-cyan group-hover:w-full transition-all duration-300 ease-out" />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-5 py-2.5 rounded-lg font-display font-bold text-lg uppercase tracking-wide transition-all duration-300 ${
                  isActive 
                    ? 'text-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                    : 'text-text-secondary hover:text-white hover:bg-white/5 hover:text-neon-cyan'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent shadow-[0_0_8px_rgba(4,217,255,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth Button */}
        <div className="flex items-center gap-4">
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
