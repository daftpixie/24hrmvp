// ============================================
// 24HRMVP - USE LIVESTREAM HOOK
// File: frontend/hooks/useLivestream.ts
// Livestreaming state and controls
// ============================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiUrl } from '@/lib/config';

export interface Livestream {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'STARTING' | 'LIVE' | 'ENDING' | 'ENDED' | 'CANCELLED' | 'ERROR';
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  hostId: string;
  host: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  viewerCount: number;
  peakViewers: number;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  tags: string[];
  category: string | null;
  chatRoomId: string | null;
  createdAt: string;
}

export interface LivestreamPlayer {
  play: () => void;
  pause: () => void;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export function useLivestream(streamId: string | null) {
  const [stream, setStream] = useState<Livestream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  const fetchStream = useCallback(async () => {
    if (!streamId) return;

    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/livestreams/${streamId}`);
      
      if (!res.ok) {
        throw new Error('Failed to load stream');
      }
      
      const data = await res.json();
      setStream(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch livestream:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stream');
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  // Poll for updates when stream is live
  useEffect(() => {
    if (!streamId || !stream || stream.status !== 'LIVE') {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      return;
    }

    // Poll every 10 seconds for viewer count updates
    pollIntervalRef.current = setInterval(fetchStream, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [streamId, stream, fetchStream]);

  // Initial fetch
  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  const startStream = useCallback(async () => {
    if (!streamId) return false;

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/livestreams/${streamId}/start`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to start stream');
      }

      await fetchStream();
      return true;
    } catch (err) {
      console.error('Failed to start stream:', err);
      setError(err instanceof Error ? err.message : 'Failed to start stream');
      return false;
    }
  }, [streamId, fetchStream]);

  const endStream = useCallback(async () => {
    if (!streamId) return false;

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/livestreams/${streamId}/end`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to end stream');
      }

      await fetchStream();
      return true;
    } catch (err) {
      console.error('Failed to end stream:', err);
      setError(err instanceof Error ? err.message : 'Failed to end stream');
      return false;
    }
  }, [streamId, fetchStream]);

  const updateViewerCount = useCallback(async (delta: number) => {
    if (!streamId) return;

    try {
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/livestreams/${streamId}/viewers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
        credentials: 'include'
      });
    } catch (err) {
      console.error('Failed to update viewer count:', err);
    }
  }, [streamId]);

  return {
    stream,
    loading,
    error,
    refresh: fetchStream,
    startStream,
    endStream,
    updateViewerCount,
    isLive: stream?.status === 'LIVE',
    isEnded: stream?.status === 'ENDED'
  };
}

// Hook for fetching list of livestreams
export function useLivestreams(filter?: 'live' | 'upcoming' | 'past') {
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      const url = filter 
        ? `${apiUrl}/api/livestreams?filter=${filter}`
        : `${apiUrl}/api/livestreams`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('Failed to load streams');
      }
      
      const data = await res.json();
      setStreams(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch livestreams:', err);
      setError(err instanceof Error ? err.message : 'Failed to load streams');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  return {
    streams,
    loading,
    error,
    refresh: fetchStreams
  };
}
