/**
 * 24HRMVP Public Analytics Dashboard - API Route
 * 
 * File: frontend/app/api/analytics/stats/route.ts
 * 
 * Fetches ecosystem stats from Plausible and returns them to the frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getEcosystemStats, 
  getSiteStats,
  getRealtimeVisitors,
} from '@/lib/analytics/plausible-api';
import type { TimePeriod, EcosystemSite } from '@/lib/types/plausible';
import { ECOSYSTEM_SITES } from '@/lib/types/plausible';

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'ecosystem';
  const siteId = searchParams.get('siteId');
  const period = (searchParams.get('period') || '30d') as TimePeriod;

  try {
    switch (type) {
      case 'ecosystem': {
        // Get all ecosystem stats
        const stats = await getEcosystemStats(ECOSYSTEM_SITES, period);
        return NextResponse.json(stats, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        });
      }

      case 'site': {
        // Get stats for a specific site
        if (!siteId) {
          return NextResponse.json(
            { error: 'siteId is required for site stats' },
            { status: 400 }
          );
        }
        
        const site = ECOSYSTEM_SITES.find((s: EcosystemSite) => s.siteId === siteId);
        if (!site) {
          return NextResponse.json(
            { error: 'Invalid siteId' },
            { status: 400 }
          );
        }

        const stats = await getSiteStats(site, period);
        return NextResponse.json(stats, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        });
      }

      case 'realtime': {
        // Get realtime visitor counts for all sites
        const realtimeCounts = await Promise.all(
          ECOSYSTEM_SITES.map(async (site: EcosystemSite) => ({
            siteId: site.siteId,
            siteName: site.siteName,
            visitors: await getRealtimeVisitors(site.siteId),
          }))
        );
        
        return NextResponse.json(
          { sites: realtimeCounts },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
            },
          }
        );
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// ============================================================================
// REVALIDATION
// ============================================================================

export const revalidate = 60; // Revalidate every 60 seconds
