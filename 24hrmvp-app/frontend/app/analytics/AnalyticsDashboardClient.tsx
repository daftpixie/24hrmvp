'use client';

/**
 * 24HRMVP Public Analytics Dashboard - Client Component
 * 
 * File: frontend/app/analytics/AnalyticsDashboardClient.tsx
 * 
 * Interactive client component for the analytics dashboard
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { MetricCard, SiteCard } from '@/components/analytics/MetricCard';
import { VisitorChart } from '@/components/analytics/VisitorChart';
import type { 
  EcosystemStats, 
  SiteStats, 
  EcosystemSite,
  PlausibleBreakdownItem,
} from '@/lib/types/plausible';
import { ECOSYSTEM_SITES } from '@/lib/types/plausible';

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsDashboardClientProps {
  initialStats: EcosystemStats;
}

interface PageWithSite extends PlausibleBreakdownItem {
  site: string;
}

// ============================================================================
// LIVE COUNTER COMPONENT
// ============================================================================

function LiveCounter({ count }: { count: number }) {
  const [displayCount, setDisplayCount] = useState(0);
  
  useEffect(() => {
    // Animate count up
    const duration = 1500;
    const startTime = Date.now();
    const startCount = displayCount;
    const diff = count - startCount;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplayCount(Math.round(startCount + diff * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [count]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="relative inline-flex flex-col items-center"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-[#04D9FF]/20 blur-3xl rounded-full" />
      
      <div className="relative bg-gradient-to-br from-[#1A1D3A] to-[#0B192A] border border-[#04D9FF]/30 rounded-2xl px-8 py-6 backdrop-blur-xl">
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-2xl">
          <div className="absolute inset-0 rounded-2xl border-2 border-[#2CFF05] animate-ping opacity-20" />
        </div>
        
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2CFF05] opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#2CFF05]" />
            </span>
            <span className="text-sm font-semibold text-[#2CFF05] uppercase tracking-wider">
              Live
            </span>
          </div>
          
          {/* Count */}
          <div className="text-center">
            <motion.span
              key={displayCount}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl md:text-6xl font-bold font-display text-white"
              style={{
                textShadow: '0 0 40px rgba(4, 217, 255, 0.5)',
              }}
            >
              {displayCount}
            </motion.span>
            <p className="text-sm text-[#A8A9AD] mt-1">
              {count === 1 ? 'visitor' : 'visitors'} right now
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PERIOD SELECTOR
// ============================================================================

type Period = '7d' | '30d' | '6mo' | '12mo';

function PeriodSelector({ 
  selected, 
  onChange 
}: { 
  selected: Period; 
  onChange: (period: Period) => void;
}) {
  const periods: { value: Period; label: string }[] = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '6mo', label: '6 months' },
    { value: '12mo', label: '12 months' },
  ];

  return (
    <div className="inline-flex bg-[#1A1D3A]/80 rounded-xl p-1 border border-[#3D4159]">
      {periods.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            selected === value
              ? 'bg-[#04D9FF]/20 text-[#04D9FF] border border-[#04D9FF]/30'
              : 'text-[#A8A9AD] hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD CLIENT
// ============================================================================

export function AnalyticsDashboardClient({ initialStats }: AnalyticsDashboardClientProps) {
  const [stats, setStats] = useState(initialStats);
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [realtimeCount, setRealtimeCount] = useState(initialStats.realtimeTotal);

  // Refresh realtime count every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/analytics/stats?type=realtime');
        const data = await response.json();
        const total = data.sites?.reduce((sum: number, site: { visitors: number }) => sum + site.visitors, 0) || 0;
        setRealtimeCount(total);
      } catch (error) {
        console.error('Failed to refresh realtime:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch new data when period changes
  useEffect(() => {
    async function fetchData() {
      if (period === '30d' && stats === initialStats) return; // Skip initial fetch
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/analytics/stats?type=ecosystem&period=${period}`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [period]);

  // Get site colors
  const getSiteColor = (siteId: string): string => {
    return ECOSYSTEM_SITES.find((s: EcosystemSite) => s.siteId === siteId)?.color || '#04D9FF';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <Link href="/" className="inline-block mb-6">
          <motion.span 
            className="text-sm font-mono text-[#04D9FF] hover:text-[#04D9FF]/80 transition-colors"
            whileHover={{ x: -4 }}
          >
            ← Back to 24HRMVP
          </motion.span>
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
          <span className="text-white">Ecosystem </span>
          <span 
            className="text-transparent bg-clip-text bg-gradient-to-r from-[#04D9FF] to-[#8A00C4]"
            style={{
              textShadow: '0 0 60px rgba(4, 217, 255, 0.3)',
            }}
          >
            Analytics
          </span>
        </h1>
        <p className="text-lg text-[#A8A9AD] max-w-2xl mx-auto">
          Radical transparency. Real-time metrics across all 24HRMVP platforms.
          <br />
          <span className="text-sm opacity-75">Updated every minute</span>
        </p>
      </motion.div>

      {/* Live counter */}
      <div className="flex justify-center mb-12">
        <LiveCounter count={realtimeCount} />
      </div>

      {/* Period selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center mb-8"
      >
        <PeriodSelector selected={period} onChange={setPeriod} />
      </motion.div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0B192A]/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[#04D9FF] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#A8A9AD]">Loading analytics...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ecosystem metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <MetricCard
          label="Total Visitors"
          value={stats.totalVisitors}
          change={0} // Would need to calc from timeseries
          icon="👥"
          color="#04D9FF"
          delay={0}
        />
        <MetricCard
          label="Total Pageviews"
          value={stats.totalPageviews}
          icon="📄"
          color="#8A00C4"
          delay={0.1}
        />
        <MetricCard
          label="Bounce Rate"
          value={stats.avgBounceRate}
          format="percent"
          inverse={true}
          icon="↩️"
          color="#FF5C00"
          delay={0.2}
        />
        <MetricCard
          label="Avg. Visit Duration"
          value={stats.avgVisitDuration}
          format="duration"
          icon="⏱️"
          color="#2CFF05"
          delay={0.3}
        />
      </div>

      {/* Main chart */}
      <div className="mb-12">
        <VisitorChart
          data={stats.combinedTimeseries}
          height={350}
          title="Ecosystem Traffic"
          subtitle={`Combined visitors & pageviews - Last ${period === '7d' ? '7 days' : period === '30d' ? '30 days' : period === '6mo' ? '6 months' : '12 months'}`}
        />
      </div>

      {/* Sites breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Platform Breakdown</h2>
          <span className="text-sm text-[#A8A9AD]">{stats.sites.length} active sites</span>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {stats.sites.map((site: SiteStats, index: number) => (
            <SiteCard
              key={site.siteId}
              siteId={site.siteId}
              siteName={site.siteName}
              siteDescription={site.siteDescription}
              siteIcon={site.siteIcon}
              siteUrl={site.siteUrl}
              visitors={site.aggregate.visitors}
              visitorsChange={site.aggregate.visitorsChange}
              pageviews={site.aggregate.pageviews}
              realtime={site.realtime}
              color={getSiteColor(site.siteId)}
              delay={0.5 + index * 0.1}
            />
          ))}
        </div>
      </motion.div>

      {/* Top pages section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid md:grid-cols-2 gap-6 mb-12"
      >
        {/* Top pages across sites */}
        <div className="bg-[#1A1D3A]/60 backdrop-blur-xl border border-[#3D4159] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Pages</h3>
          <div className="space-y-3">
            {stats.sites
              .flatMap((site: SiteStats): PageWithSite[] => 
                site.topPages.map((page: PlausibleBreakdownItem) => ({ ...page, site: site.siteName }))
              )
              .sort((a: PageWithSite, b: PageWithSite) => b.visitors - a.visitors)
              .slice(0, 8)
              .map((page: PageWithSite, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#3D4159]/50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-mono text-[#A8A9AD] w-6">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{page.page || '/'}</p>
                      <p className="text-xs text-[#A8A9AD]">{page.site}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-[#04D9FF] ml-4">
                    {page.visitors.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Top sources */}
        <div className="bg-[#1A1D3A]/60 backdrop-blur-xl border border-[#3D4159] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Sources</h3>
          <div className="space-y-3">
            {stats.sites
              .flatMap((site: SiteStats): PlausibleBreakdownItem[] => site.topSources)
              .reduce((acc: PlausibleBreakdownItem[], source: PlausibleBreakdownItem) => {
                const existing = acc.find((s: PlausibleBreakdownItem) => s.source === source.source);
                if (existing) {
                  existing.visitors += source.visitors;
                } else {
                  acc.push({ ...source });
                }
                return acc;
              }, [] as PlausibleBreakdownItem[])
              .sort((a: PlausibleBreakdownItem, b: PlausibleBreakdownItem) => b.visitors - a.visitors)
              .slice(0, 8)
              .map((source: PlausibleBreakdownItem, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#3D4159]/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-[#A8A9AD] w-6">{i + 1}.</span>
                    <span className="text-sm text-white">{source.source || 'Direct'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-[#3D4159] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#04D9FF] to-[#8A00C4] rounded-full"
                        style={{ 
                          width: `${Math.min(100, (source.visitors / stats.totalVisitors) * 100 * 10)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono text-[#04D9FF] w-16 text-right">
                      {source.visitors.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center border-t border-[#3D4159] pt-8"
      >
        <p className="text-sm text-[#A8A9AD]">
          Powered by{' '}
          <a 
            href="https://plausible.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#04D9FF] hover:underline"
          >
            Plausible Analytics
          </a>
          {' '}• Privacy-first, GDPR compliant
        </p>
        <p className="text-xs text-[#A8A9AD]/50 mt-2">
          Self-hosted at analytics.24hrmvp.xyz • No cookies, no tracking scripts
        </p>
      </motion.div>
    </div>
  );
}

export default AnalyticsDashboardClient;
