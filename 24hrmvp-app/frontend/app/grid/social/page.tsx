'use client';

// ============================================
// 24HRMVP - GRID SOCIAL PAGE
// File: frontend/app/grid/social/page.tsx
// ============================================

import { SocialWall } from '@/components/grid/SocialWall';
import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';

function SocialPageContent() {
  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <span className="text-neon-cyan animate-pulse">((o))</span> Social Feed
          </h1>
          <p className="text-text-secondary mt-1">Aggregated content from across the social web</p>
        </div>
      </div>
      <SocialWall />
    </div>
  );
}

export default function SocialPage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <SocialPageContent />
    </ClientOnly>
  );
}
