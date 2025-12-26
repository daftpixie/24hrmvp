/**
 * 24HRMVP Public Analytics Dashboard - Plausible API Types
 * 
 * File: frontend/lib/types/plausible.ts
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PlausibleRealtimeResponse {
  visitors: number;
}

export interface PlausibleAggregateResponse {
  results: {
    visitors?: { value: number; change?: number };
    pageviews?: { value: number; change?: number };
    visits?: { value: number; change?: number };
    bounce_rate?: { value: number; change?: number };
    visit_duration?: { value: number; change?: number };
    views_per_visit?: { value: number; change?: number };
  };
}

export interface PlausibleTimeseriesDataPoint {
  date: string;
  visitors?: number;
  pageviews?: number;
  visits?: number;
  bounce_rate?: number;
  visit_duration?: number;
}

export interface PlausibleTimeseriesResponse {
  results: PlausibleTimeseriesDataPoint[];
}

export interface PlausibleBreakdownItem {
  page?: string;
  source?: string;
  referrer?: string;
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  visitors: number;
  pageviews?: number;
  bounce_rate?: number;
  visit_duration?: number;
}

export interface PlausibleBreakdownResponse {
  results: PlausibleBreakdownItem[];
}

// ============================================================================
// DASHBOARD DATA TYPES
// ============================================================================

export interface SiteStats {
  siteId: string;
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  siteIcon: string;
  realtime: number;
  aggregate: {
    visitors: number;
    visitorsChange: number;
    pageviews: number;
    pageviewsChange: number;
    bounceRate: number;
    bounceRateChange: number;
    visitDuration: number;
    visitDurationChange: number;
  };
  timeseries: PlausibleTimeseriesDataPoint[];
  topPages: PlausibleBreakdownItem[];
  topSources: PlausibleBreakdownItem[];
}

export interface EcosystemStats {
  totalVisitors: number;
  totalPageviews: number;
  realtimeTotal: number;
  avgBounceRate: number;
  avgVisitDuration: number;
  sites: SiteStats[];
  combinedTimeseries: PlausibleTimeseriesDataPoint[];
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

export type TimePeriod = 
  | 'day' 
  | '7d' 
  | '30d' 
  | 'month' 
  | '6mo' 
  | '12mo' 
  | 'custom';

export interface StatsQuery {
  siteId: string;
  period?: TimePeriod;
  date?: string;
  metrics?: string[];
  filters?: string;
  compare?: 'previous_period';
}

// ============================================================================
// SITE CONFIGURATION
// ============================================================================

export const ECOSYSTEM_SITES = [
  {
    siteId: '24hrmvp.xyz',
    siteName: 'Main Platform',
    siteUrl: 'https://24hrmvp.xyz',
    siteDescription: 'Community-driven MVP development hub',
    siteIcon: '🚀',
    color: '#04D9FF',
  },
  {
    siteId: 'launch.24hrmvp.xyz',
    siteName: 'Launch Page',
    siteUrl: 'https://launch.24hrmvp.xyz',
    siteDescription: 'Early access & waitlist',
    siteIcon: '🎯',
    color: '#FF5C00',
  },
  {
    siteId: 'punks.24hrmvp.xyz',
    siteName: 'The Cyphers',
    siteUrl: 'https://punks.24hrmvp.xyz',
    siteDescription: 'Cypherpunk NFT collection on Dogecoin',
    siteIcon: '🔐',
    color: '#8A00C4',
  },
  {
    siteId: 'all.24hrmvp.xyz',
    siteName: 'Ecosystem Total',
    siteUrl: 'https://analytics.24hrmvp.xyz/all.24hrmvp.xyz',
    siteDescription: 'Aggregate metrics across all sites',
    siteIcon: '📊',
    color: '#2CFF05',
  },
] as const;

export type EcosystemSiteId = typeof ECOSYSTEM_SITES[number]['siteId'];
