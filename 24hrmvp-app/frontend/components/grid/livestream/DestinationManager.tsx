// ============================================================================
// 24HRMVP Phase 4: Destination Manager Component
// frontend/components/grid/livestream/DestinationManager.tsx
// ============================================================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Local type definitions (not in useLivestream hook)
export enum StreamPlatform {
  YOUTUBE = 'youtube',
  TWITCH = 'twitch',
  TWITTER = 'twitter',
  PUMPFUN = 'pumpfun',
}

export interface StreamDestination {
  platform: StreamPlatform;
  name: string;
  status: 'connected' | 'live' | 'connecting' | 'error' | 'offline';
  rtmpUrl?: string;
  streamKey?: string;
  viewerCount?: number;
}

interface DestinationManagerProps {
  streamId: string;
  destinations: StreamDestination[];
  onUpdate: () => void;
  isHost: boolean;
}

// Platform configuration
const PLATFORMS = [
  {
    id: StreamPlatform.YOUTUBE,
    name: 'YouTube',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    color: '#FF0000',
    instructions: 'Get your stream key from YouTube Studio → Go Live → Stream',
    requiresRtmp: false,
  },
  {
    id: StreamPlatform.TWITCH,
    name: 'Twitch',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
      </svg>
    ),
    color: '#9146FF',
    instructions: 'Get your stream key from Twitch Dashboard → Settings → Stream',
    requiresRtmp: false,
  },
  {
    id: StreamPlatform.TWITTER,
    name: 'X (Twitter)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: '#000000',
    instructions: 'Create a broadcast in X Media Studio → Sources → RTMP',
    requiresRtmp: true,
  },
  {
    id: StreamPlatform.PUMPFUN,
    name: 'Pump.fun',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
    color: '#14F195',
    instructions: 'Start livestream on your token page → Get RTMP credentials',
    requiresRtmp: true,
  },
];

export default function DestinationManager({
  streamId,
  destinations,
  onUpdate,
  isHost,
}: DestinationManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<typeof PLATFORMS[0] | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rtmpUrl: '',
    streamKey: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stub functions for destination management
  // Note: These should call the backend API when implemented
  const addDestination = async (data: {
    platform: StreamPlatform;
    name: string;
    rtmpUrl?: string;
    streamKey?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/livestreams/${streamId}/destinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add destination');
      }
      
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add destination');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeDestination = async (platform: StreamPlatform) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/livestreams/${streamId}/destinations/${platform}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove destination');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove destination');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get platform by ID
  const getPlatform = (id: string) => PLATFORMS.find((p) => p.id === id);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-500';
      case 'connected':
        return 'bg-[#04D9FF]';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Handle add destination
  const handleAdd = async () => {
    if (!selectedPlatform) return;

    setFormError(null);

    // Validate
    if (!formData.name) {
      setFormError('Please enter a name for this destination');
      return;
    }

    if (selectedPlatform.requiresRtmp && (!formData.rtmpUrl || !formData.streamKey)) {
      setFormError('Please enter both RTMP URL and Stream Key');
      return;
    }

    try {
      await addDestination({
        platform: selectedPlatform.id,
        name: formData.name,
        rtmpUrl: formData.rtmpUrl || undefined,
        streamKey: formData.streamKey || undefined,
      });

      setShowAddModal(false);
      setSelectedPlatform(null);
      setFormData({ name: '', rtmpUrl: '', streamKey: '' });
      onUpdate();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Handle remove destination
  const handleRemove = async (platform: StreamPlatform) => {
    if (!confirm('Remove this destination?')) return;

    try {
      await removeDestination(platform);
      onUpdate();
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-semibold text-[#FAFAFA]"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Streaming Destinations
        </h3>
        {isHost && (
          <button
            onClick={() => setShowAddModal(true)}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-lg
              bg-[#04D9FF]/10 text-[#04D9FF] text-sm
              hover:bg-[#04D9FF]/20 transition-colors
              border border-[#04D9FF]/30
            "
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Platform
          </button>
        )}
      </div>

      {/* Destinations list */}
      <div className="space-y-3">
        {destinations.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl bg-white/5 border border-white/10">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#04D9FF]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#04D9FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <p className="text-[#B0B0B0] text-sm">No destinations configured yet</p>
            <p className="text-[#808080] text-xs mt-1">Add platforms to simulcast your stream</p>
          </div>
        ) : (
          destinations.map((dest, index) => {
            const platform = getPlatform(dest.platform);
            return (
              <motion.div
                key={dest.platform}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="
                  flex items-center justify-between p-4 rounded-xl
                  bg-white/5 border border-white/10
                  hover:border-white/20 transition-colors
                "
              >
                <div className="flex items-center gap-4">
                  {/* Platform icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${platform?.color}20` }}
                  >
                    <div style={{ color: platform?.color }}>{platform?.icon}</div>
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#FAFAFA] font-medium">{dest.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(dest.status)}`} />
                        <span className="text-[#808080] text-xs capitalize">{dest.status}</span>
                      </div>
                    </div>
                    <p className="text-[#808080] text-xs mt-0.5">{platform?.name}</p>
                  </div>
                </div>

                {/* Actions */}
                {isHost && (
                  <button
                    onClick={() => handleRemove(dest.platform)}
                    disabled={loading}
                    className="
                      p-2 rounded-lg text-[#808080]
                      hover:text-red-500 hover:bg-red-500/10
                      transition-colors
                    "
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Destination Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-[#1E1E1E] to-[#2E2E2E] border border-[#04D9FF]/30 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-lg font-bold text-[#FAFAFA]"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {selectedPlatform ? `Add ${selectedPlatform.name}` : 'Select Platform'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedPlatform(null);
                    }}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#808080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                {!selectedPlatform ? (
                  // Platform selection
                  <div className="grid grid-cols-2 gap-3">
                    {PLATFORMS.map((platform) => {
                      const isAdded = destinations.some((d) => d.platform === platform.id);
                      return (
                        <button
                          key={platform.id}
                          onClick={() => !isAdded && setSelectedPlatform(platform)}
                          disabled={isAdded}
                          className={`
                            flex flex-col items-center gap-2 p-4 rounded-xl
                            border transition-all
                            ${
                              isAdded
                                ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                                : 'bg-white/5 border-white/10 hover:border-[#04D9FF]/50 hover:bg-white/10'
                            }
                          `}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${platform.color}20` }}
                          >
                            <div style={{ color: platform.color }}>{platform.icon}</div>
                          </div>
                          <span className="text-[#FAFAFA] text-sm font-medium">{platform.name}</span>
                          {isAdded && <span className="text-[#808080] text-xs">Added</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Platform configuration
                  <div className="space-y-4">
                    {/* Instructions */}
                    <div className="p-3 rounded-lg bg-[#04D9FF]/10 border border-[#04D9FF]/30">
                      <p className="text-[#04D9FF] text-sm">{selectedPlatform.instructions}</p>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={`My ${selectedPlatform.name} Channel`}
                        className="
                          w-full px-4 py-3 rounded-lg
                          bg-white/5 border border-white/10
                          text-[#FAFAFA] placeholder-[#808080]
                          focus:border-[#04D9FF] focus:ring-1 focus:ring-[#04D9FF]/30
                          transition-all outline-none
                        "
                      />
                    </div>

                    {/* RTMP credentials (if required) */}
                    {selectedPlatform.requiresRtmp && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                            RTMP URL *
                          </label>
                          <input
                            type="text"
                            value={formData.rtmpUrl}
                            onChange={(e) => setFormData({ ...formData, rtmpUrl: e.target.value })}
                            placeholder="rtmp://..."
                            className="
                              w-full px-4 py-3 rounded-lg font-mono text-sm
                              bg-white/5 border border-white/10
                              text-[#FAFAFA] placeholder-[#808080]
                              focus:border-[#04D9FF] focus:ring-1 focus:ring-[#04D9FF]/30
                              transition-all outline-none
                            "
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                            Stream Key *
                          </label>
                          <input
                            type="password"
                            value={formData.streamKey}
                            onChange={(e) => setFormData({ ...formData, streamKey: e.target.value })}
                            placeholder="Your stream key"
                            className="
                              w-full px-4 py-3 rounded-lg font-mono text-sm
                              bg-white/5 border border-white/10
                              text-[#FAFAFA] placeholder-[#808080]
                              focus:border-[#04D9FF] focus:ring-1 focus:ring-[#04D9FF]/30
                              transition-all outline-none
                            "
                          />
                        </div>
                      </>
                    )}

                    {/* Stream key only (YouTube/Twitch) */}
                    {!selectedPlatform.requiresRtmp && (
                      <div>
                        <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                          Stream Key *
                        </label>
                        <input
                          type="password"
                          value={formData.streamKey}
                          onChange={(e) => setFormData({ ...formData, streamKey: e.target.value })}
                          placeholder="Your stream key"
                          className="
                            w-full px-4 py-3 rounded-lg font-mono text-sm
                            bg-white/5 border border-white/10
                            text-[#FAFAFA] placeholder-[#808080]
                            focus:border-[#04D9FF] focus:ring-1 focus:ring-[#04D9FF]/30
                            transition-all outline-none
                          "
                        />
                      </div>
                    )}

                    {/* Error */}
                    {(formError || error) && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <p className="text-red-400 text-sm">{formError || error}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => setSelectedPlatform(null)}
                        className="flex-1 px-4 py-2 rounded-lg text-[#B0B0B0] hover:bg-white/5 transition-colors"
                      >
                        Back
                      </button>
                      <motion.button
                        onClick={handleAdd}
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="
                          flex-1 px-4 py-2 rounded-lg
                          bg-[#04D9FF] text-black font-semibold
                          hover:bg-[#00FEFC]
                          disabled:opacity-50
                          transition-colors
                        "
                      >
                        {loading ? 'Adding...' : 'Add Destination'}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
