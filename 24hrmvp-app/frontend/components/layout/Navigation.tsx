'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useFarcasterAuth } from '@/hooks/useFarcasterAuth';
import Button from '@/components/ui/Button';

export default function Navigation() {
  const pathname = usePathname();
  const { isAuthenticated, username, authenticate, loading } = useFarcasterAuth();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/submit', label: 'Submit Idea' },
    { href: '/vote', label: 'Vote' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/projects', label: 'Projects' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[rgba(14,25,42,0.8)] backdrop-blur-2xl border-b border-[rgba(4,217,255,0.2)]">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-3xl font-black chrome-text">
            24HRMVP
          </Link>
          
          <div className="flex gap-8">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href} className="nav-link">
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="nav-active-indicator"
                    />
                  )}
                </Link>
              );
            })}
          </div>
          
          <div>
            {loading ? (
              <div className="loading-spinner" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-[--neon-cyan]">@{username}</span>
                <Button variant="ghost" size="sm">Profile</Button>
              </div>
            ) : (
              <Button variant="neon" onClick={authenticate}>
                Connect Farcaster
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
