'use client';

/**
 * 24HRMVP Public Analytics Dashboard - Metric Components
 * 
 * File: frontend/components/analytics/MetricCard.tsx
 */

import { motion } from 'framer-motion';
import { formatNumber, formatChange, getChangeColor, formatDuration } from '@/lib/analytics/plausible-api';

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  label: string;
  value: number;
  change?: number;
  format?: 'number' | 'percent' | 'duration';
  inverse?: boolean; // For metrics where lower is better (bounce rate)
  icon?: React.ReactNode;
  color?: string;
  delay?: number;
}

export function MetricCard({
  label,
  value,
  change,
  format = 'number',
  inverse = false,
  icon,
  color = '#04D9FF',
  delay = 0,
}: MetricCardProps) {
  const formattedValue = 
    format === 'percent' ? `${Math.round(value)}%` :
    format === 'duration' ? formatDuration(value) :
    formatNumber(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#04D9FF]/10 to-transparent rounded-2xl blur-xl group-hover:from-[#04D9FF]/20 transition-all duration-500" />
      
      <div className="relative bg-[#1A1D3A]/80 backdrop-blur-xl border border-[#3D4159] rounded-2xl p-6 hover:border-[#04D9FF]/50 transition-all duration-300">
        {/* Glow line at top */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] rounded-full"
          style={{ 
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            boxShadow: `0 0 20px ${color}40`
          }}
        />

        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium text-[#A8A9AD] uppercase tracking-wider">
            {label}
          </span>
          {icon && (
            <span className="text-xl" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
              {icon}
            </span>
          )}
        </div>

        <div className="flex items-end gap-3">
          <motion.span
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
            className="text-4xl font-bold font-display tracking-tight"
            style={{ 
              color,
              textShadow: `0 0 30px ${color}60`
            }}
          >
            {formattedValue}
          </motion.span>
          
          {change !== undefined && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: delay + 0.4 }}
              className={`text-sm font-mono font-semibold ${getChangeColor(change, inverse)}`}
            >
              {formatChange(change)}
            </motion.span>
          )}
        </div>

        {/* Animated pulse for realtime metrics */}
        {label.toLowerCase().includes('live') && value > 0 && (
          <div className="absolute top-4 right-4">
            <span className="relative flex h-3 w-3">
              <span 
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: color }}
              />
              <span 
                className="relative inline-flex rounded-full h-3 w-3"
                style={{ backgroundColor: color }}
              />
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// SITE CARD
// ============================================================================

interface SiteCardProps {
  siteId: string;
  siteName: string;
  siteDescription: string;
  siteIcon: string;
  siteUrl: string;
  visitors: number;
  visitorsChange: number;
  pageviews: number;
  realtime: number;
  color: string;
  delay?: number;
  onClick?: () => void;
}

export function SiteCard({
  siteName,
  siteDescription,
  siteIcon,
  siteUrl,
  visitors,
  visitorsChange,
  pageviews,
  realtime,
  color,
  delay = 0,
  onClick,
}: SiteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -4 }}
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      {/* Background glow */}
      <div 
        className="absolute inset-0 rounded-2xl blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
        style={{ backgroundColor: color }}
      />

      <div className="relative bg-gradient-to-br from-[#1A1D3A] to-[#0B192A] border border-[#3D4159] rounded-2xl p-6 hover:border-opacity-50 transition-all duration-300"
        style={{ borderColor: `${color}40` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl" style={{ filter: `drop-shadow(0 0 10px ${color})` }}>
              {siteIcon}
            </span>
            <div>
              <h3 className="font-semibold text-lg text-white">{siteName}</h3>
              <p className="text-sm text-[#A8A9AD]">{siteDescription}</p>
            </div>
          </div>
          
          {/* Live indicator */}
          {realtime > 0 && (
            <div className="flex items-center gap-2 bg-[#0B192A]/80 px-3 py-1.5 rounded-full border border-[#2CFF05]/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2CFF05] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2CFF05]" />
              </span>
              <span className="text-xs font-mono font-semibold text-[#2CFF05]">
                {realtime} live
              </span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-[#A8A9AD] uppercase tracking-wider mb-1">Visitors</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono" style={{ color }}>
                {formatNumber(visitors)}
              </span>
              <span className={`text-xs font-mono ${getChangeColor(visitorsChange)}`}>
                {formatChange(visitorsChange)}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-[#A8A9AD] uppercase tracking-wider mb-1">Pageviews</p>
            <span className="text-2xl font-bold font-mono text-white">
              {formatNumber(pageviews)}
            </span>
          </div>
        </div>

        {/* Footer with link */}
        <div className="flex items-center justify-between pt-4 border-t border-[#3D4159]/50">
          <a 
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#A8A9AD] hover:text-white transition-colors font-mono"
          >
            {siteUrl.replace('https://', '')}
          </a>
          <motion.span
            whileHover={{ x: 4 }}
            className="text-[#04D9FF]"
          >
            →
          </motion.span>
        </div>

        {/* Corner accent */}
        <div 
          className="absolute top-0 right-0 w-20 h-20 opacity-10"
          style={{
            background: `radial-gradient(circle at top right, ${color}, transparent 70%)`
          }}
        />
      </div>
    </motion.div>
  );
}

export default MetricCard;
