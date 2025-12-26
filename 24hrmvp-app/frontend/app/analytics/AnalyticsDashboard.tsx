/**
 * 24HRMVP Public Analytics Dashboard - Main Dashboard Component
 * 
 * File: frontend/app/analytics/AnalyticsDashboard.tsx
 * 
 * Server component that fetches data and renders the dashboard
 */

import { getEcosystemStats } from '@/lib/analytics/plausible-api';
import { ECOSYSTEM_SITES } from '@/lib/types/plausible';
import { AnalyticsDashboardClient } from './AnalyticsDashboardClient';

// ============================================================================
// SERVER COMPONENT - FETCHES DATA
// ============================================================================

export async function AnalyticsDashboard() {
  // Fetch ecosystem stats server-side
  const stats = await getEcosystemStats(ECOSYSTEM_SITES, '30d');

  return <AnalyticsDashboardClient initialStats={stats} />;
}

export default AnalyticsDashboard;
