// ============================================================================
// 24HRMVP Phase 4: Livestream Hub Page
// frontend/app/grid/live/page.tsx
// ============================================================================

'use client';

// PRODUCTION FIX: Force dynamic rendering for auth context
// This prevents static generation errors with useAuth hook
export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLivestreams } from '@/hooks/useLivestream';
import LivestreamCard from '@/components/grid/livestream/LivestreamCard';
import GoLiveButton from '@/components/grid/livestream/GoLiveButton';

// Stream status enum (for reference)
enum StreamStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  STARTING = 'STARTING',
  LIVE = 'LIVE',
  ENDING = 'ENDING',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
  ERROR = 'ERROR'
}

export default function LivestreamHubPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'past'>('live');
  
  // Fetch streams based on active tab
  const { streams: liveStreams, loading: liveLoading } = useLivestreams('live');
  const { streams: upcomingStreams, loading: upcomingLoading } = useLivestreams('upcoming');
  const { streams: pastStreams, loading: pastLoading } = useLivestreams('past');

  // Get current streams based on tab
  const currentStreams = activeTab === 'live' 
    ? liveStreams 
    : activeTab === 'upcoming' 
      ? upcomingStreams 
      : pastStreams;
  
  const isLoading = activeTab === 'live' 
    ? liveLoading 
    : activeTab === 'upcoming' 
      ? upcomingLoading 
      : pastLoading;

  return (
    <div className="min-h-screen bg-[#0B192A]">
      {/* Animated background grid */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(4, 217, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(4, 217, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[#808080] mb-2">
              <Link href="/grid" className="hover:text-[#04D9FF] transition-colors">
                The Grid
              </Link>
              <span>/</span>
              <span className="text-[#04D9FF]">Live</span>
            </div>

            <h1
              className="text-3xl md:text-4xl font-black text-transparent bg-clip-text"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                backgroundImage: 'linear-gradient(135deg, #A8A9AD 0%, #E3E3E3 25%, #C0C0C3 50%, #E3E3E3 75%, #A8A9AD 100%)',
              }}
            >
              LIVESTREAM HUB
            </h1>
            <p className="text-[#B0B0B0] mt-2">
              Watch live streams, join the conversation, and go live yourself
            </p>
          </div>

          {/* Go Live Button */}
          <GoLiveButton variant="hero" />
        </div>

        {/* Featured Live Stream (if any) */}
        {liveStreams.length > 0 && activeTab === 'live' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-semibold">LIVE NOW</span>
              </div>
              <span className="text-[#808080] text-sm">
                {liveStreams.length} stream{liveStreams.length !== 1 ? 's' : ''} broadcasting
              </span>
            </div>

            {/* Featured stream - first live stream */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <LivestreamCard stream={liveStreams[0]} variant="featured" />
              </div>
              {liveStreams.length > 1 && (
                <div className="space-y-4">
                  {liveStreams.slice(1, 3).map((stream) => (
                    <LivestreamCard key={stream.id} stream={stream} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 w-fit mb-6">
          {[
            { id: 'live', label: 'Live Now', count: liveStreams.length },
            { id: 'upcoming', label: 'Upcoming', count: upcomingStreams.length },
            { id: 'past', label: 'Past Streams', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                relative px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  activeTab === tab.id
                    ? 'text-black'
                    : 'text-[#B0B0B0] hover:text-[#FAFAFA]'
                }
              `}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#04D9FF] rounded-lg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span
                    className={`
                      px-1.5 py-0.5 text-xs rounded-full
                      ${
                        activeTab === tab.id
                          ? 'bg-black/20 text-black'
                          : 'bg-white/10 text-[#B0B0B0]'
                      }
                    `}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* Stream Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-video rounded-xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : currentStreams.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {currentStreams.map((stream, index) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <LivestreamCard stream={stream} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <EmptyState activeTab={activeTab} />
        )}

        {/* Simulcast info section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-[#1E1E1E] to-[#2E2E2E] border border-[#04D9FF]/20"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#04D9FF]/20 to-[#8A00C4]/20 flex items-center justify-center border border-[#04D9FF]/30">
                <svg
                  className="w-10 h-10 text-[#04D9FF]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3
                className="text-xl font-bold text-[#FAFAFA] mb-2"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Multi-Platform Simulcasting
              </h3>
              <p className="text-[#B0B0B0] text-sm max-w-2xl">
                Go live simultaneously on YouTube, Twitch, X (Twitter), and Pump.fun with a single stream. 
                Reach your audience everywhere they are while engaging with the 24HRMVP community.
              </p>
            </div>

            <div className="flex gap-4">
              {/* Platform icons */}
              {[
                { name: 'YouTube', color: '#FF0000' },
                { name: 'Twitch', color: '#9146FF' },
                { name: 'X', color: '#FFFFFF' },
                { name: 'Pump.fun', color: '#14F195' },
              ].map((platform) => (
                <div
                  key={platform.name}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${platform.color}20` }}
                  title={platform.name}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ activeTab }: { activeTab: string }) {
  const content = {
    live: {
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: 'No Live Streams',
      description: 'Be the first to go live! Start streaming to YouTube, Twitch, X, and Pump.fun simultaneously.',
      action: <GoLiveButton variant="compact" className="mt-4" />,
    },
    upcoming: {
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: 'No Upcoming Streams',
      description: 'No streams scheduled yet. Schedule your next broadcast to let the community know when you\'ll be live.',
      action: null,
    },
    past: {
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'No Past Streams',
      description: 'Past streams will appear here after they end. Start streaming to build your archive.',
      action: null,
    },
  };

  const { icon, title, description, action } = content[activeTab as keyof typeof content];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#04D9FF]/10 to-[#8A00C4]/10 flex items-center justify-center mb-6 border border-[#04D9FF]/20">
        <div className="text-[#04D9FF]">{icon}</div>
      </div>
      <h3
        className="text-xl font-bold text-[#FAFAFA] mb-2 text-center"
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        {title}
      </h3>
      <p className="text-[#B0B0B0] text-center max-w-md">{description}</p>
      {action}
    </motion.div>
  );
}
