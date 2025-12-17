'use client';

// ============================================
// 24HRMVP - GRID LAYOUT (FIXED SSR)
// File: frontend/app/grid/layout.tsx
// Shared layout for all /grid/* pages
// FIXED: Wrapped auth-dependent components in ClientOnly
// ============================================

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import auth-dependent components with SSR disabled
// This prevents "useAuth must be used within AuthProvider" errors
const Header = dynamic(() => import('@/components/layout/Header'), {
  ssr: false,
  loading: () => (
    <header className="sticky top-0 z-50 w-full h-16 border-b border-white/10 bg-[#0B192A]/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="chrome-text text-2xl font-black tracking-tight">
          24HR<span className="text-[#04D9FF]">MVP</span>
        </div>
        <div className="w-24 h-8 bg-white/5 rounded-lg animate-pulse" />
      </div>
    </header>
  ),
});

const GridHeader = dynamic(() => import('@/components/grid/GridHeader'), {
  ssr: false,
  loading: () => (
    <div className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(4,217,255,0.1)]">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="w-20 h-6 bg-white/5 rounded animate-pulse" />
          <div className="w-20 h-6 bg-white/5 rounded animate-pulse" />
          <div className="w-20 h-6 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </div>
  ),
});

export default function GridLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={
        <header className="sticky top-0 z-50 w-full h-16 border-b border-white/10 bg-[#0B192A]/80" />
      }>
        <Header />
      </Suspense>
      <div className="min-h-screen bg-[--bg-deepest]">
        <Suspense fallback={
          <div className="h-12 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(4,217,255,0.1)]" />
        }>
          <GridHeader />
        </Suspense>
        {children}
      </div>
    </>
  );
}