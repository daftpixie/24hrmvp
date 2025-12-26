/**
 * 24HRMVP Public Analytics Dashboard - Plausible Stats API Client
 * 
 * File: frontend/lib/analytics/plausible-api.ts
 * 
 * Server-side only - fetches data from Plausible Stats API
 * Docs: https://plausible.io/docs/stats-api
 */

import type {
  PlausibleRealtimeResponse,
  PlausibleAggregateResponse,
  PlausibleTimeseriesResponse,
  PlausibleBreakdownResponse,
  PlausibleTimeseriesDataPoint,
  TimePeriod,
  SiteStats,
  EcosystemStats,
  EcosystemSite,
} from '@/lib/types/plausible';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PLAUSIBLE_API_URL = process.env.PLAUSIBLE_API_URL || 'https://analytics.24hrmvp.xyz';
const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY || '';

// Cache duration in seconds
const CACHE_DURATION = 60; // 1 minute for realtime feel

// ============================================================================
// BASE FETCH FUNCTION
// ============================================================================

async function plausibleFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${PLAUSIBLE_API_URL}/api/v1/stats${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${PLAUSIBLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: CACHE_DURATION },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Plausible API error: ${response.status}`, error);
    throw new Error(`Plausible API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get realtime visitor count for a site
 */
export async function getRealtimeVisitors(siteId: string): Promise<number> {
  try {
    const data = await plausibleFetch<PlausibleRealtimeResponse>(
      '/realtime/visitors',
      { site_id: siteId }
    );
    return data.visitors || 0;
  } catch (error) {
    console.error(`Failed to get realtime for ${siteId}:`, error);
    return 0;
  }
}

/**
 * Get aggregate stats for a site
 */
export async function getAggregateStats(
  siteId: string,
  period: TimePeriod = '30d',
  metrics: string[] = ['visitors', 'pageviews', 'bounce_rate', 'visit_duration']
): Promise<PlausibleAggregateResponse['results']> {
  try {
    const data = await plausibleFetch<PlausibleAggregateResponse>(
      '/aggregate',
      {
        site_id: siteId,
        period,
        metrics: metrics.join(','),
        compare: 'previous_period',
      }
    );
    return data.results;
  } catch (error) {
    console.error(`Failed to get aggregate for ${siteId}:`, error);
    return {};
  }
}

/**
 * Get timeseries data for charts
 */
export async function getTimeseries(
  siteId: string,
  period: TimePeriod = '30d',
  metrics: string[] = ['visitors', 'pageviews']
): Promise<PlausibleTimeseriesDataPoint[]> {
  try {
    const data = await plausibleFetch<PlausibleTimeseriesResponse>(
      '/timeseries',
      {
        site_id: siteId,
        period,
        metrics: metrics.join(','),
      }
    );
    return data.results || [];
  } catch (error) {
    console.error(`Failed to get timeseries for ${siteId}:`, error);
    return [];
  }
}

/**
 * Get breakdown by property (pages, sources, etc.)
 */
export async function getBreakdown(
  siteId: string,
  property: 'event:page' | 'visit:source' | 'visit:country' | 'visit:device',
  period: TimePeriod = '30d',
  limit: number = 10
): Promise<PlausibleBreakdownResponse['results']> {
  try {
    const data = await plausibleFetch<PlausibleBreakdownResponse>(
      '/breakdown',
      {
        site_id: siteId,
        period,
        property,
        limit: limit.toString(),
        metrics: 'visitors,pageviews',
      }
    );
    return data.results || [];
  } catch (error) {
    console.error(`Failed to get breakdown for ${siteId}:`, error);
    return [];
  }
}

// ============================================================================
// COMPOSITE FUNCTIONS
// ============================================================================

/**
 * Get complete stats for a single site
 */
export async function getSiteStats(
  site: EcosystemSite,
  period: TimePeriod = '30d'
): Promise<SiteStats> {
  const [realtime, aggregate, timeseries, topPages, topSources] = await Promise.all([
    getRealtimeVisitors(site.siteId),
    getAggregateStats(site.siteId, period),
    getTimeseries(site.siteId, period),
    getBreakdown(site.siteId, 'event:page', period, 5),
    getBreakdown(site.siteId, 'visit:source', period, 5),
  ]);

  return {
    siteId: site.siteId,
    siteName: site.siteName,
    siteUrl: site.siteUrl,
    siteDescription: site.siteDescription,
    siteIcon: site.siteIcon,
    realtime,
    aggregate: {
      visitors: aggregate.visitors?.value || 0,
      visitorsChange: aggregate.visitors?.change || 0,
      pageviews: aggregate.pageviews?.value || 0,
      pageviewsChange: aggregate.pageviews?.change || 0,
      bounceRate: aggregate.bounce_rate?.value || 0,
      bounceRateChange: aggregate.bounce_rate?.change || 0,
      visitDuration: aggregate.visit_duration?.value || 0,
      visitDurationChange: aggregate.visit_duration?.change || 0,
    },
    timeseries,
    topPages,
    topSources,
  };
}

/**
 * Get ecosystem-wide stats for all sites
 */
export async function getEcosystemStats(
  sites: readonly EcosystemSite[],
  period: TimePeriod = '30d'
): Promise<EcosystemStats> {
  // Fetch stats for all sites in parallel
  const siteStats = await Promise.all(
    sites
      .filter((s: EcosystemSite) => s.siteId !== 'all.24hrmvp.xyz') // Exclude aggregate site
      .map((site: EcosystemSite) => getSiteStats(site, period))
  );

  // Get aggregate data from the roll-up site
  const [aggregateRealtime, aggregateStats, aggregateTimeseries] = await Promise.all([
    getRealtimeVisitors('all.24hrmvp.xyz'),
    getAggregateStats('all.24hrmvp.xyz', period),
    getTimeseries('all.24hrmvp.xyz', period),
  ]);

  return {
    totalVisitors: aggregateStats.visitors?.value || 0,
    totalPageviews: aggregateStats.pageviews?.value || 0,
    realtimeTotal: aggregateRealtime,
    avgBounceRate: aggregateStats.bounce_rate?.value || 0,
    avgVisitDuration: aggregateStats.visit_duration?.value || 0,
    sites: siteStats,
    combinedTimeseries: aggregateTimeseries,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format seconds to human readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format number with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Format percentage change with + or -
 */
export function formatChange(change: number): string {
  if (change === 0) return '0%';
  const sign = change > 0 ? '+' : '';
  return `${sign}${Math.round(change)}%`;
}

/**
 * Get color class based on change direction
 */
export function getChangeColor(change: number, inverse: boolean = false): string {
  if (change === 0) return 'text-gray-400';
  const isPositive = inverse ? change < 0 : change > 0;
  return isPositive ? 'text-[#2CFF05]' : 'text-[#FF5C00]';
}
