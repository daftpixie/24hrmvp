'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import Header from '@/components/layout/Header';
import ClientOnly from '@/components/ClientOnly';

// Icons
const UserIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M4 20C4 17 7 14 12 14C17 14 20 17 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const WalletIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="16" cy="13" r="1" fill="currentColor"/>
    <path d="M3 9L7.5 4.5C8 4 9 3.5 10 3.5H17C18 3.5 19 4 19.5 4.5L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function ProfileIndexContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    // If authenticated, redirect to own profile
    if (!isLoading && isAuthenticated && user) {
      const userId = user.username || (user.fid ? user.fid.toString() : null);
      if (userId) {
        router.replace(`/profile/${userId}`);
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#04D9FF]/30 border-t-[#04D9FF] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#808080]">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated but no user ID yet, show loading
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#04D9FF]/30 border-t-[#04D9FF] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#808080]">Redirecting to your profile...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  return (
    <div className="min-h-screen bg-[#0B192A] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#04D9FF]/20 to-[#8A00C4]/20 flex items-center justify-center mx-auto mb-6 border border-[#04D9FF]/30">
            <UserIcon className="w-10 h-10 text-[#04D9FF]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Your Profile</h1>
          <p className="text-[#808080]">
            Connect your wallet to view your profile, track your achievements, and manage your submissions.
          </p>
        </div>

        <div className="bg-[#1E1E1E]/60 rounded-2xl border border-white/10 p-6 space-y-4">
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-[#04D9FF] to-[#1F51FF] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <WalletIcon className="w-5 h-5" />
            Connect Wallet
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1E1E1E] text-[#808080]">or</span>
            </div>
          </div>

          <Link
            href="/leaderboard"
            className="block w-full text-center px-6 py-4 rounded-xl border border-white/20 text-[#B0B0B0] hover:bg-white/5 transition-colors"
          >
            Browse Community Profiles
          </Link>
        </div>

        <div className="mt-8 text-center">
          <h3 className="text-white font-semibold mb-3">What you'll get access to:</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Track your ideas', icon: '💡' },
              { label: 'View achievements', icon: '🏆' },
              { label: 'Monitor votes', icon: '🗳️' },
              { label: 'See your stats', icon: '📊' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-white/5 text-[#B0B0B0]">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileIndexPage() {
  return (
    <ClientOnly>
      <ProfileIndexContent />
    </ClientOnly>
  );
}
