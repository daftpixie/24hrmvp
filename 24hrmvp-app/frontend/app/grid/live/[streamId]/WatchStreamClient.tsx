'use client';

// ============================================================================
// 24HRMVP Phase 4: Watch Stream Client Component
// frontend/app/grid/live/[streamId]/WatchStreamClient.tsx
// ============================================================================

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLivestream, type Livestream } from '@/hooks/useLivestream';
import LivestreamPlayer from '@/components/grid/livestream/LivestreamPlayer';

// Stream status enum (matches Livestream type)
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

export default function WatchStreamClient() {
  const params = useParams();
  const streamId = params.streamId as string;
  const { stream, loading, error, isLive } = useLivestream(streamId);
  const [showChat, setShowChat] = useState(true);
  
  // Get viewer count from stream
  const viewerCount = stream?.viewerCount || 0;

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate live duration
  const [liveDuration, setLiveDuration] = useState(0);
  useEffect(() => {
    if (stream?.status !== StreamStatus.LIVE || !stream?.startedAt) return;

    const interval = setInterval(() => {
      const start = new Date(stream.startedAt!).getTime();
      const now = Date.now();
      setLiveDuration(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [stream?.status, stream?.startedAt]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#04D9FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#B0B0B0]">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#FAFAFA] mb-2">Stream Not Found</h2>
          <p className="text-[#B0B0B0] mb-6">This stream may have ended or doesn't exist.</p>
          <Link
            href="/grid/live"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#04D9FF] text-black rounded-lg font-medium hover:bg-[#00FEFC] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Live Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B192A]">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
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

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-white/10 bg-[#1E1E1E]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/grid/live"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-[#808080]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>

              {/* Stream info */}
              <div className="flex items-center gap-3">
                {stream.host.pfpUrl ? (
                  <img
                    src={stream.host.pfpUrl}
                    alt={stream.host.displayName || stream.host.username}
                    className="w-8 h-8 rounded-full border border-[#04D9FF]/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#04D9FF] to-[#8A00C4] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {(stream.host.displayName || stream.host.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-sm font-semibold text-[#FAFAFA] line-clamp-1">
                    {stream.title}
                  </h1>
                  <p className="text-xs text-[#808080]">
                    {stream.host.displayName || stream.host.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Stream stats */}
            <div className="flex items-center gap-4">
              {isLive && (
                <>
                  {/* Live badge */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-md">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-xs font-bold uppercase">Live</span>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-md">
                    <svg className="w-4 h-4 text-[#04D9FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-white text-xs font-mono">{formatDuration(liveDuration)}</span>
                  </div>

                  {/* Viewers */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-md">
                    <svg className="w-4 h-4 text-[#04D9FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-white text-xs font-mono">{viewerCount.toLocaleString()}</span>
                  </div>
                </>
              )}

              {/* Toggle chat button */}
              <button
                onClick={() => setShowChat(!showChat)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${showChat ? 'bg-[#04D9FF]/20 text-[#04D9FF]' : 'bg-white/10 text-[#808080]'}
                `}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className={`grid gap-6 ${showChat ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
            {/* Video player */}
            <div className={showChat ? 'lg:col-span-2' : ''}>
              <LivestreamPlayer
                playbackUrl={stream.playbackUrl}
                isLive={isLive}
                thumbnailUrl={stream.thumbnailUrl || undefined}
                title={stream.title}
                hostName={stream.host.displayName || stream.host.username}
                viewerCount={viewerCount}
              />

              {/* Stream details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2
                      className="text-xl font-bold text-[#FAFAFA] mb-2"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {stream.title}
                    </h2>
                    {stream.description && (
                      <p className="text-[#B0B0B0] text-sm whitespace-pre-wrap">
                        {stream.description}
                      </p>
                    )}

                    {/* Tags */}
                    {stream.tags && stream.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {stream.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-[#04D9FF]/10 text-[#04D9FF] text-xs rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Host info */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      {stream.host.pfpUrl ? (
                        <img
                          src={stream.host.pfpUrl}
                          alt={stream.host.displayName || stream.host.username}
                          className="w-12 h-12 rounded-full border-2 border-[#04D9FF]/30"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#04D9FF] to-[#8A00C4] flex items-center justify-center">
                          <span className="text-white text-lg font-bold">
                            {(stream.host.displayName || stream.host.username).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-[#FAFAFA] font-medium">
                          {stream.host.displayName || stream.host.username}
                        </p>
                        <p className="text-[#808080] text-xs">@{stream.host.username}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform destinations - DISABLED: destinations property not in Livestream type */}
                {/* TODO: Add destinations support when backend implements it */}
                {/*
                {stream.destinations && stream.destinations.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-sm text-[#808080] mb-3">Also streaming on:</p>
                    <div className="flex flex-wrap gap-2">
                      {stream.destinations.map((dest) => (
                        <div
                          key={dest.platform}
                          className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg
                            ${
                              dest.status === 'live'
                                ? 'bg-green-500/10 border border-green-500/30'
                                : 'bg-white/5 border border-white/10'
                            }
                          `}
                        >
                          <span
                            className={`
                              w-2 h-2 rounded-full
                              ${dest.status === 'live' ? 'bg-green-500' : 'bg-gray-500'}
                            `}
                          />
                          <span className="text-sm text-[#FAFAFA]">{dest.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                */}
              </motion.div>
            </div>

            {/* Chat sidebar - Placeholder until StreamChat component is created */}
            {showChat && stream.chatRoomId && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-1 h-[calc(100vh-200px)] min-h-[500px]"
              >
                <div className="h-full rounded-xl overflow-hidden border border-white/10 bg-[#1E1E1E] flex flex-col">
                  {/* Chat header */}
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#04D9FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <h3 className="font-semibold text-white">Stream Chat</h3>
                    </div>
                    {isLive && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                        Live
                      </span>
                    )}
                  </div>
                  
                  {/* Chat placeholder content */}
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#04D9FF]/10 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-[#04D9FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                    </div>
                    <h4 className="text-[#FAFAFA] font-medium mb-2">Stream Chat</h4>
                    <p className="text-[#808080] text-sm mb-4">
                      Chat integration coming soon!
                    </p>
                    <Link
                      href={`/grid/chat`}
                      className="text-[#04D9FF] text-sm hover:underline"
                    >
                      Open full chat â†’
                    </Link>
                  </div>
                  
                  {/* Disabled input */}
                  <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg text-[#808080]">
                      <span className="text-sm">Chat coming soon...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
