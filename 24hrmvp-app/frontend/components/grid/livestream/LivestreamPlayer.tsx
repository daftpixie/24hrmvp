// ============================================================================
// 24HRMVP Phase 4: Livestream Video Player
// frontend/components/grid/livestream/LivestreamPlayer.tsx
// ============================================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';

interface LivestreamPlayerProps {
  playbackUrl: string | null;
  isLive: boolean;
  placeholderUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  hostName?: string;
  viewerCount?: number;
  onError?: (error: string) => void;
}

export default function LivestreamPlayer({
  playbackUrl,
  isLive,
  placeholderUrl = '/images/stream-placeholder.png',
  thumbnailUrl,
  title,
  hostName,
  viewerCount = 0,
  onError,
}: LivestreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl || !isLive) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(playbackUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(console.error);
        setIsPlaying(true);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          const errorMsg = 'Stream playback error';
          setError(errorMsg);
          onError?.(errorMsg);

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = playbackUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(console.error);
        setIsPlaying(true);
      });
    }
  }, [playbackUrl, isLive, onError]);

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  // Toggle play/pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // If not live, show placeholder
  if (!isLive || !playbackUrl) {
    return (
      <div className="relative w-full aspect-video bg-gradient-to-br from-[#0B192A] via-[#1E1E1E] to-[#0B192A] rounded-xl overflow-hidden border border-[#04D9FF]/20">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(4, 217, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(4, 217, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'grid-scroll 20s linear infinite',
            }}
          />
        </div>

        {/* Placeholder content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Stream thumbnail"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          ) : (
            <div className="relative">
              {/* Animated pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-[#04D9FF]/50"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{ width: 120, height: 120, left: -10, top: -10 }}
              />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#04D9FF]/20 to-[#8A00C4]/20 flex items-center justify-center backdrop-blur-sm border border-[#04D9FF]/30">
                <svg
                  className="w-12 h-12 text-[#04D9FF]"
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
          )}

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 font-heading text-xl text-[#FAFAFA]"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {title || 'Stream Offline'}
          </motion.p>

          {hostName && (
            <p className="mt-2 text-[#B0B0B0] text-sm">
              Hosted by <span className="text-[#04D9FF]">{hostName}</span>
            </p>
          )}

          <div className="mt-4 px-4 py-2 rounded-full bg-[#1E1E1E]/80 border border-[#04D9FF]/30 backdrop-blur-sm">
            <span className="text-[#808080] text-sm">Waiting for stream to start...</span>
          </div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#04D9FF]/30 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#04D9FF]/30 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[#04D9FF]/30 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#04D9FF]/30 rounded-br-xl" />
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />

      {/* Error overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-500"
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
              <p className="text-white font-medium">{error}</p>
              <p className="text-gray-400 text-sm mt-2">Attempting to reconnect...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live badge */}
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-md shadow-lg shadow-red-600/30">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-sm font-semibold uppercase tracking-wider">
            Live
          </span>
        </div>
        {viewerCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-md">
            <svg
              className="w-4 h-4 text-[#04D9FF]"
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
            <span className="text-white text-sm font-mono">
              {viewerCount.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
          >
            {/* Center play button */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-[#04D9FF]/20 backdrop-blur-sm border border-[#04D9FF]/50 flex items-center justify-center hover:bg-[#04D9FF]/30 transition-colors"
              >
                <svg
                  className="w-10 h-10 text-[#04D9FF] ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    {isPlaying ? (
                      <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-white ml-0.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Mute/Unmute */}
                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    {isMuted ? (
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                          clipRule="evenodd"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    {isFullscreen ? (
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
