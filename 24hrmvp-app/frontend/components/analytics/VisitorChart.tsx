'use client';

/**
 * 24HRMVP Public Analytics Dashboard - Chart Components
 * 
 * File: frontend/components/analytics/VisitorChart.tsx
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PlausibleTimeseriesDataPoint } from '@/lib/types/plausible';

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#0B192A]/95 backdrop-blur-xl border border-[#04D9FF]/30 rounded-xl p-4 shadow-2xl">
      <p className="text-xs text-[#A8A9AD] font-mono mb-2">{label}</p>
      {payload.map((entry, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-white capitalize">{entry.name}:</span>
          <span 
            className="text-sm font-mono font-bold"
            style={{ color: entry.color }}
          >
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// VISITOR CHART
// ============================================================================

interface VisitorChartProps {
  data: PlausibleTimeseriesDataPoint[];
  height?: number;
  showPageviews?: boolean;
  title?: string;
  subtitle?: string;
}

export function VisitorChart({
  data,
  height = 300,
  showPageviews = true,
  title = 'Ecosystem Traffic',
  subtitle = 'Visitors & pageviews over time',
}: VisitorChartProps) {
  // Format dates for display
  const chartData = useMemo(() => {
    return data.map((point: PlausibleTimeseriesDataPoint) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative"
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#04D9FF]/5 to-transparent rounded-3xl blur-2xl" />

      <div className="relative bg-[#1A1D3A]/60 backdrop-blur-xl border border-[#3D4159] rounded-3xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="text-sm text-[#A8A9AD]">{subtitle}</p>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#04D9FF]" />
              <span className="text-xs text-[#A8A9AD]">Visitors</span>
            </div>
            {showPageviews && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#8A00C4]" />
                <span className="text-xs text-[#A8A9AD]">Pageviews</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#04D9FF" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#04D9FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pageviewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8A00C4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8A00C4" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#3D4159" 
                vertical={false}
              />
              
              <XAxis 
                dataKey="date" 
                stroke="#A8A9AD"
                tick={{ fill: '#A8A9AD', fontSize: 11 }}
                axisLine={{ stroke: '#3D4159' }}
                tickLine={false}
              />
              
              <YAxis 
                stroke="#A8A9AD"
                tick={{ fill: '#A8A9AD', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => value.toLocaleString()}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="#04D9FF"
                strokeWidth={2}
                fill="url(#visitorsGradient)"
                animationDuration={1500}
              />
              
              {showPageviews && (
                <Area
                  type="monotone"
                  dataKey="pageviews"
                  stroke="#8A00C4"
                  strokeWidth={2}
                  fill="url(#pageviewsGradient)"
                  animationDuration={1500}
                  animationBegin={300}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-[#04D9FF]/50 to-transparent" />
      </div>
    </motion.div>
  );
}

// ============================================================================
// MINI SPARKLINE
// ============================================================================

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = '#04D9FF', height = 40 }: SparklineProps) {
  const chartData = data.map((value: number, index: number) => ({ value, index }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparkline-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sparkline-${color})`}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default VisitorChart;
