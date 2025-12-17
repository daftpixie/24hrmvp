// ============================================================================
// 24HRMVP Phase 4: Livestream Card Component
// frontend/components/grid/livestream/LivestreamCard.tsx
// ============================================================================

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Livestream } from '@/hooks/useLivestream';

// Local StreamStatus enum (not exported from hook)
enum StreamStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  STARTING = 'STARTING',
  LIVE = 'LIVE',
  ENDING = 'ENDING',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
  ERROR = 'ERROR',
}

interface LivestreamCardProps {
  stream: Livestream;
  variant?: 'default' | 'featured';
}

export default function LivestreamCard({
  stream,
  variant = 'default',
}: LivestreamCardProps) {
  const isLive = stream.status === StreamStatus.LIVE;
  const isScheduled = stream.status === StreamStatus.SCHEDULED;
  const isStarting = stream.status === StreamStatus.STARTING;

  // Format scheduled time
  const formatScheduledTime = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) return 'Starting soon';
    if (diffHours < 1) return `In ${diffMins}m`;
    if (diffHours < 24) return `In ${diffHours}h ${diffMins}m`;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Platform icons for destination display
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        );
      case 'twitch':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
          </svg>
        );
      case 'twitter':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case 'pumpfun':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        );
    }
  };

  const cardContent = (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`
        relative rounded-xl overflow-hidden cursor-pointer
        bg-gradient-to-br from-[#1E1E1E] to-[#2E2E2E]
        border border-[#04D9FF]/20 hover:border-[#04D9FF]/50
        shadow-lg hover:shadow-[0_0_30px_rgba(4,217,255,0.2)]
        transition-all duration-300
        ${variant === 'featured' ? 'col-span-2 row-span-2' : ''}
      `}
    >
      {/* Thumbnail / Preview */}
      <div className={`relative ${variant === 'featured' ? 'aspect-video' : 'aspect-video'}`}>
        {stream.thumbnailUrl ? (
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0B192A] via-[#1E1E1E] to-[#0B192A]">
            {/* Grid pattern background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(4, 217, 255, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(4, 217, 255, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '30px 30px',
              }}
            />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#04D9FF]/10 flex items-center justify-center border border-[#04D9FF]/30">
                <svg
                  className="w-8 h-8 text-[#04D9FF]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Status badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 rounded-md shadow-lg shadow-red-600/30">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">
                Live
              </span>
            </div>
          )}
          {isStarting && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500 rounded-md">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-black text-xs font-bold uppercase">
                Starting
              </span>
            </div>
          )}
          {isScheduled && (
            <div className="px-2.5 py-1 bg-[#04D9FF]/20 backdrop-blur-sm rounded-md border border-[#04D9FF]/30">
              <span className="text-[#04D9FF] text-xs font-medium">
                {formatScheduledTime(stream.scheduledAt)}
              </span>
            </div>
          )}
        </div>

        {/* Viewer count */}
        {isLive && stream.viewerCount > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md">
            <svg
              className="w-3.5 h-3.5 text-[#04D9FF]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span className="text-white text-xs font-mono">
              {stream.viewerCount.toLocaleString()}
            </span>
          </div>
        )}

        {/* Platform destinations - TODO: Uncomment when backend implements destinations */}
        {/* {stream.destinations && stream.destinations.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            {stream.destinations.slice(0, 4).map((dest, idx) => (
              <div
                key={idx}
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center
                  ${
                    dest.status === 'live'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : dest.status === 'connected'
                      ? 'bg-[#04D9FF]/20 text-[#04D9FF] border border-[#04D9FF]/50'
                      : 'bg-gray-800/80 text-gray-500 border border-gray-600/50'
                  }
                `}
                title={`${dest.name}: ${dest.status}`}
              >
                {getPlatformIcon(dest.platform)}
              </div>
            ))}
            {stream.destinations.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-gray-800/80 text-gray-400 text-xs flex items-center justify-center">
                +{stream.destinations.length - 4}
              </div>
            )}
          </div>
        )} */}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Host avatar */}
          <div className="flex-shrink-0">
            {stream.host.pfpUrl ? (
              <img
                src={stream.host.pfpUrl}
                alt={stream.host.displayName || stream.host.username}
                className="w-10 h-10 rounded-full border-2 border-[#04D9FF]/30 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#04D9FF] to-[#8A00C4] flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {(stream.host.displayName || stream.host.username).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Title and host info */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-[#FAFAFA] font-semibold text-sm line-clamp-2 leading-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {stream.title}
            </h3>
            <p className="text-[#B0B0B0] text-xs mt-1 truncate">
              {stream.host.displayName || stream.host.username}
            </p>
            {stream.category && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-[#04D9FF]/10 text-[#04D9FF] text-xs rounded">
                {stream.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-xl border border-[#04D9FF]/50 shadow-[0_0_20px_rgba(4,217,255,0.3)]" />
      </div>
    </motion.div>
  );

  return (
    <Link href={`/grid/live/${stream.id}`}>
      {cardContent}
    </Link>
  );
}
