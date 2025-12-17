'use client';

// PRODUCTION FIX: Force dynamic rendering for auth context
// This prevents static generation errors with useAuth hook
export const dynamic = 'force-dynamic'


import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useState } from 'react';
import { useSocialFeed, useTrendingSocial, useFarcasterChannels } from '@/hooks/useGrid';
import { Radio, TrendingUp, Hash, ExternalLink, Heart, Repeat2, MessageCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

type PlatformFilter = 'all' | 'FARCASTER';

function SocialPageContent() {
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const { posts, loading, error, refresh } = useSocialFeed({ platform: platform === 'all' ? undefined : platform, limit: 20 });
  const { posts: trending } = useTrendingSocial(5);
  const { channels } = useFarcasterChannels(10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Radio className="w-8 h-8 text-[#FB48C4]" />
            Social Feed
          </h1>
          <p className="text-[#808080] mt-1">Aggregated content from across the social web</p>
        </div>
        <button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'FARCASTER'].map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p as PlatformFilter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${platform === p ? 'border-[#04D9FF] bg-[#04D9FF]/20 text-[#04D9FF]' : 'border-transparent bg-white/5 text-[#B0B0B0]'}`}
          >
            {p === 'all' ? 'All' : 'Farcaster'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />{error}
            </div>
          )}

          {loading && posts.length === 0 ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="p-4 bg-[#1E1E1E]/60 border border-white/10 rounded-xl animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-white/5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-1/3" />
                    <div className="h-4 bg-white/5 rounded w-full" />
                  </div>
                </div>
              </div>
            ))
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <article key={post.id} className="p-4 bg-[#1E1E1E]/60 border border-white/10 rounded-xl hover:border-[#FB48C4]/30 transition-colors">
                <div className="flex items-start gap-3">
                  <img src={(post as any).authorAvatar || '/default-avatar.png'} alt="" className="w-12 h-12 rounded-full border border-white/20" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{(post as any).authorDisplayName || post.authorUsername}</span>
                      <span className="text-[#808080] text-sm">@{post.authorUsername}</span>
                      <span className="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">{post.platform}</span>
                    </div>
                    <p className="text-white mt-2 whitespace-pre-wrap">{post.content}</p>
                    {(post as any).channelName && (
                      <div className="flex items-center gap-1 mt-2">
                        <Hash className="w-3 h-3 text-[#04D9FF]" />
                        <span className="text-[#04D9FF] text-sm">{(post as any).channelName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-6 mt-3 text-[#808080]">
                      <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" />{(post as any).likes || 0}</span>
                      <span className="flex items-center gap-1.5"><Repeat2 className="w-4 h-4" />{(post as any).reposts || 0}</span>
                      <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" />{(post as any).replies || 0}</span>
                      {((post as any).externalUrl || post.url) && (
                        <a href={(post as any).externalUrl || post.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#04D9FF] ml-auto">
                          <ExternalLink className="w-4 h-4" />View
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="text-center py-16 text-[#808080]">
              <Radio className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No posts found</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-[#1E1E1E]/60 border border-white/10 rounded-xl">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#FB48C4]" />Trending
            </h3>
            {trending.length > 0 ? (
              <div className="space-y-3">
                {trending.map((post, i) => (
                  <div key={post.id} className="flex items-start gap-2 text-sm">
                    <span className="text-[#808080] font-mono">{i + 1}</span>
                    <p className="text-white line-clamp-2">{post.content?.slice(0, 60)}...</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-[#808080] text-sm">No trending posts</p>}
          </div>

          <div className="p-4 bg-[#1E1E1E]/60 border border-white/10 rounded-xl">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Hash className="w-5 h-5 text-purple-400" />Channels
            </h3>
            {channels.length > 0 ? (
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div key={channel.id} className="px-3 py-2 rounded-lg text-sm hover:bg-white/5 text-[#B0B0B0]">
                    <span className="font-medium">/{channel.name}</span>
                    <span className="text-[#808080] text-xs ml-2">{channel.followerCount?.toLocaleString()} followers</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[#808080] text-sm">Channels unavailable</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
export default function SocialPage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <SocialPageContent />
    </ClientOnly>
  );
}
