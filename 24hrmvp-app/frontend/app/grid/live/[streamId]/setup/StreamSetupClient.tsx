'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useLivestream } from '@/hooks/useLivestream';
import type { StreamStatus } from '@/lib/types/grid';
import { getApiUrl } from '@/lib/config';
import { getToken } from '@/providers/AuthProvider';
import { Copy, Check, Play, Square, ArrowLeft, AlertCircle, Loader2, Eye, Radio } from 'lucide-react';

export default function StreamSetupClient() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.streamId as string;
  const { stream, loading, error, refresh, startStream, endStream, isLive } = useLivestream(streamId);

  // Get viewer count from stream
  const viewerCount = stream?.viewerCount || 0;

  // Stream credentials state
  const [controlsLoading, setControlsLoading] = useState(false);
  const [controlsError, setControlsError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ rtmpUrl: string; streamKey: string } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const getCredentials = async (): Promise<{ rtmpUrl: string; streamKey: string } | null> => {
    try {
      const apiUrl = getApiUrl();
      const token = getToken();
      
      const response = await fetch(`${apiUrl}/api/livestreams/${streamId}/credentials`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch credentials');
      }
      
      const data = await response.json();
      return data;
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
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#04D9FF] animate-spin mx-auto mb-4" />
          <p className="text-[#808080]">Loading stream setup...</p>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <div className="max-w-md text-center p-8 bg-[#1E1E1E]/60 border border-white/10 rounded-xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Stream Not Found</h1>
          <p className="text-[#808080] mb-6">{error || "This stream doesn't exist or you don't have access."}</p>
          <Link 
            href="/grid/live"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#04D9FF] text-black font-semibold rounded-lg hover:bg-[#04D9FF]/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Live Hub
          </Link>
        </div>
      </div>
    );
  }

  // Use string literals for status comparison
  const status = stream.status as StreamStatus;
  const isStarting = status === 'STARTING';
  const canGoLive = status === 'DRAFT' || status === 'SCHEDULED';
  const isStreaming = status === 'LIVE' || status === 'STARTING';

  // Status badge color
  const getStatusColor = (s: StreamStatus): string => {
    switch (s) {
      case 'LIVE': return 'bg-red-500 text-white';
      case 'STARTING': return 'bg-yellow-500 text-black';
      case 'SCHEDULED': return 'bg-blue-500 text-white';
      case 'ENDED': return 'bg-gray-500 text-white';
      case 'CANCELLED': return 'bg-gray-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B192A]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#1E1E1E]/60">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/grid/live"
                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-[#808080] hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Stream Setup</h1>
                <p className="text-sm text-[#808080]">{stream.title}</p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              {isStreaming && (
                <div className="flex items-center gap-2 text-sm text-[#808080]">
                  <Eye className="w-4 h-4" />
                  <span>{viewerCount} viewers</span>
                </div>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                {isLive && <Radio className="w-3 h-3 inline mr-1 animate-pulse" />}
                {status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Error Display */}
        {controlsError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{controlsError}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Stream Credentials */}
          <div className="p-6 bg-[#1E1E1E]/60 border border-white/10 rounded-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Stream Credentials</h2>
            
            {credentials ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#808080] mb-1">RTMP URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showCredentials ? 'text' : 'password'}
                      value={credentials.rtmpUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(credentials.rtmpUrl, 'rtmp')}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-[#808080] hover:text-[#04D9FF]"
                    >
                      {copied === 'rtmp' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-[#808080] mb-1">Stream Key</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showCredentials ? 'text' : 'password'}
                      value={credentials.streamKey}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(credentials.streamKey, 'key')}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-[#808080] hover:text-[#04D9FF]"
                    >
                      {copied === 'key' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="text-sm text-[#04D9FF] hover:underline"
                >
                  {showCredentials ? 'Hide' : 'Show'} credentials
                </button>
              </div>
            ) : (
              <p className="text-[#808080]">Loading credentials...</p>
            )}
          </div>

          {/* Stream Controls */}
          <div className="p-6 bg-[#1E1E1E]/60 border border-white/10 rounded-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Stream Controls</h2>
            
            <div className="space-y-4">
              {canGoLive && (
                <button
                  onClick={handleGoLive}
                  disabled={controlsLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {controlsLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Go Live
                    </>
                  )}
                </button>
              )}
              
              {isStreaming && (
                <button
                  onClick={handleEndStream}
                  disabled={controlsLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {controlsLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Square className="w-5 h-5" />
                      End Stream
                    </>
                  )}
                </button>
              )}
              
              <p className="text-sm text-[#808080]">
                {canGoLive && "Connect your streaming software using the credentials above, then click 'Go Live' when ready."}
                {isStreaming && "Your stream is live! Click 'End Stream' when you're done."}
                {status === 'ENDED' && "This stream has ended."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
