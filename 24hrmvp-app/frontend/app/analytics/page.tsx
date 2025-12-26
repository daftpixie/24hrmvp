/**
 * 24HRMVP Public Analytics Dashboard
 * 
 * File: frontend/app/analytics/page.tsx
 * 
 * Radically transparent ecosystem metrics - shows growth and trends
 * across all 24HRMVP properties.
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { AnalyticsLoading } from './AnalyticsLoading';

// ============================================================================
// METADATA
// ============================================================================

export const metadata: Metadata = {
  title: 'Ecosystem Analytics | 24HRMVP',
  description: 'Real-time analytics and growth metrics for the 24HRMVP ecosystem. Transparent data showing community engagement across all platforms.',
  openGraph: {
    title: 'Ecosystem Analytics | 24HRMVP',
    description: 'Real-time analytics and growth metrics for the 24HRMVP ecosystem',
    type: 'website',
  },
};

// ============================================================================
// PAGE
// ============================================================================

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen bg-[#0B192A] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(4, 217, 255, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(4, 217, 255, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Radial gradients */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#04D9FF]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#8A00C4]/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2CFF05]/5 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Suspense fallback={<AnalyticsLoading />}>
          <AnalyticsDashboard />
        </Suspense>
      </div>
    </main>
  );
}

// ============================================================================
// REVALIDATION
// ============================================================================

export const revalidate = 60; // Revalidate every 60 seconds
