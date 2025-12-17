'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useLivestream } from '@/hooks/useLivestream';
import { StreamStatus } from '@/lib/types/grid';
import { apiClient } from '@/lib/api/client';

export default function StreamSetupClient() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.streamId as string;
  const { stream, loading, error, refresh, startStream, endStream, isLive } = useLivestream(streamId);

  // Get viewer count from stream
  const viewerCount = stream?.viewerCount || 0;

  // Note: Stream credentials should be fetched from backend API
  // This is a simplified implementation
  const [controlsLoading, setControlsLoading] = useState(false);
  const [controlsError, setControlsError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ rtmpUrl: string; streamKey: string } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const getCredentials = async (): Promise<{ rtmpUrl: string; streamKey: string } | null> => {
    try {
      // Use apiClient.get with single endpoint argument
      const result = await apiClient.get<{ rtmpUrl: string; streamKey: string }>(`/livestreams/${streamId}/credentials`);
      return result;
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
      return null;
    }
  };

  const goLive = async () => {
    setControlsLoading(true);
    setControlsError(null);
    try {
      await startStream();
    } catch (err) {
      setControlsError(err instanceof Error ? err.message : 'Failed to start stream');
    } finally {
      setControlsLoading(false);
    }
  };

  // Fetch credentials on mount
  useEffect(() => {
    if (streamId) {
      getCredentials().then(setCredentials).catch(() => {});
    }
  }, [streamId]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Handle go live
  const handleGoLive = async () => {
    if (!confirm('Are you ready to go live? Make sure your streaming software is connected.')) return;
    try {
      await goLive();
      refresh();
    } catch (err) {
      // Error handled by goLive wrapper
    }
  };

  // Handle end stream
  const handleEndStream = async () => {
    if (!confirm('Are you sure you want to end this stream?')) return;
    setControlsLoading(true);
    setControlsError(null);
    try {
      await endStream();
      router.push('/grid/live');
    } catch (err) {
      setControlsError(err instanceof Error ? err.message : 'Failed to end stream');
    } finally {
      setControlsLoading(false);
    }
  };

  if (loading) {
    return (
      <div>Loading stream setup...</div>
    );
  }

  if (error || !stream) {
    return (
      <div>
        <h1>Stream Not Found</h1>
        <p>{error || "This stream doesn't exist or you don't have access."}</p>
        <Link href="/grid/live">Back to Live Hub</Link>
      </div>
    );
  }

  // Use string literals for comparison instead of enum values
  const isStarting = stream.status === 'STARTING';
  const canGoLive = stream.status === 'DRAFT' || stream.status === 'SCHEDULED';

  return (
    <div>
      {/* Background */}
      {/* Header */}
      <h1>Stream Setup</h1>
      <h2>{stream.title}</h2>

      {/* Status badge */}
      {(isLive || isStarting) && (
        <div>
          <span>{stream.status.replace('_', ' ')}</span>
        </div>
      )}
    </div>
  );
}
