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
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 20C4 17 7 14 12 14C17 14 20 17 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const WalletIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="16" cy="13" r="1" fill="currentColor"/>
  </svg>
);

function ProfileIndexContent() {
  const router = useRouter();
  // Fixed: Removed 'login' which does not exist on AuthContextType
  const { user, isAuthenticated, isLoading } = useAuth();

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
      <div className="min-h-screen bg-[#0B192A] text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-[#04D9FF]">Loading...</div>
        </div>
      </div>
    );
  }

  // If we're here, we're not authenticated (or redirecting)
  // We'll show a "Connect Wallet" prompt essentially
  return (
    <div className="min-h-screen bg-[#0B192A] text-white flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1E1E1E]/60 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-sm">
          <div className="w-16 h-16 bg-[#04D9FF]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon className="w-8 h-8 text-[#04D9FF]" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-white/60 mb-8">
            Redirecting to your profile...
          </p>
          
          <div className="p-4 bg-[#04D9FF]/5 border border-[#04D9FF]/20 rounded-lg">
            <div className="flex items-center gap-3 text-left">
              <WalletIcon className="w-5 h-5 text-[#04D9FF]" />
              <p className="text-sm text-white/80">
                Connect your wallet to view your profile, track your achievements, and manage your submissions.
              </p>
            </div>
          </div>
          
          <div className="mt-8">
            <Link 
              href="/"
              className="text-sm text-[#04D9FF] hover:text-[#00FEFC] hover:underline transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
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
