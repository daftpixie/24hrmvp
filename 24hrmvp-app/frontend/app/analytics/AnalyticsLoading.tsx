/**
 * 24HRMVP Public Analytics Dashboard - Loading Component
 * 
 * File: frontend/app/analytics/AnalyticsLoading.tsx
 * 
 * Skeleton loading state for the analytics dashboard
 */

import React from 'react';

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

interface SkeletonPulseProps {
  className?: string;
  style?: React.CSSProperties;
}

function SkeletonPulse({ className, style }: SkeletonPulseProps) {
  return (
    <div 
      className={`bg-gradient-to-r from-[#1A1D3A] via-[#2A2D4A] to-[#1A1D3A] bg-[length:200%_100%] animate-shimmer rounded ${className || ''}`}
      style={style}
    />
  );
}

function MetricCardSkeleton() {
  return (
    <div className="bg-[#1A1D3A]/80 border border-[#3D4159] rounded-2xl p-6">
      <SkeletonPulse className="h-4 w-24 mb-4" />
      <SkeletonPulse className="h-10 w-32" />
    </div>
  );
}

function SiteCardSkeleton() {
  return (
    <div className="bg-[#1A1D3A]/80 border border-[#3D4159] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <SkeletonPulse className="h-12 w-12 rounded-xl" />
        <div className="flex-1">
          <SkeletonPulse className="h-5 w-32 mb-2" />
          <SkeletonPulse className="h-3 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkeletonPulse className="h-16" />
        <SkeletonPulse className="h-16" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  // Pre-generate deterministic heights to avoid SSR/client mismatch
  const barHeights = [42, 65, 38, 72, 55, 48, 78, 35, 62, 45, 
                      58, 70, 40, 68, 52, 46, 75, 38, 60, 50,
                      55, 72, 42, 65, 48, 58, 70, 45, 62, 55];
  
  return (
    <div className="bg-[#1A1D3A]/60 border border-[#3D4159] rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <SkeletonPulse className="h-6 w-40 mb-2" />
          <SkeletonPulse className="h-4 w-56" />
        </div>
        <div className="flex gap-4">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-4 w-20" />
        </div>
      </div>
      <div className="h-[300px] flex items-end gap-1">
        {barHeights.map((height: number, i: number) => (
          <SkeletonPulse 
            key={i} 
            className="flex-1" 
            style={{ height: `${height}%` }} 
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN LOADING COMPONENT
// ============================================================================

export function AnalyticsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <SkeletonPulse className="h-10 w-72 mx-auto mb-4" />
        <SkeletonPulse className="h-5 w-96 mx-auto" />
      </div>

      {/* Live counter */}
      <div className="flex justify-center mb-12">
        <SkeletonPulse className="h-24 w-64 rounded-2xl" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {Array.from({ length: 4 }).map((_, i: number) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart */}
      <div className="mb-12">
        <ChartSkeleton />
      </div>

      {/* Site cards */}
      <div className="mb-8">
        <SkeletonPulse className="h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i: number) => (
            <SiteCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Bottom sections */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#1A1D3A]/80 border border-[#3D4159] rounded-2xl p-6">
          <SkeletonPulse className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <SkeletonPulse className="h-4 w-48" />
                <SkeletonPulse className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#1A1D3A]/80 border border-[#3D4159] rounded-2xl p-6">
          <SkeletonPulse className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <SkeletonPulse className="h-4 w-32" />
                <SkeletonPulse className="h-2 w-24" />
                <SkeletonPulse className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsLoading;
