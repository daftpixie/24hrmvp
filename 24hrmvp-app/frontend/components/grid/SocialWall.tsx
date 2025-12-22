'use client';

import React, { useState } from 'react';
import { useSocialFeed } from '@/hooks/useGrid';
import { Heart, MessageCircle, Repeat2, ExternalLink } from 'lucide-react';
import type { SocialPost, SocialPlatform } from '@/lib/types/grid';

const platformColors: Record<SocialPlatform, string> = {
  FARCASTER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  TWITTER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  INSTAGRAM: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  TIKTOK: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const platformIcons: Record<SocialPlatform, string> = {
  FARCASTER: '🟣',
  TWITTER: '𝕏',
  INSTAGRAM: '📷',
  TIKTOK: '🎵',
};

interface SocialWallProps {
  channelId?: string;
  limit?: number;
}

export function SocialWall({ channelId, limit = 20 }: SocialWallProps) {
  const [platform, setPlatform] = useState<SocialPlatform | undefined>(undefined);
  const { posts, loading, error } = useSocialFeed({
    platform,
    channelId,
    limit,
  });

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return diffMins + 'm';
    if (diffHours < 24) return diffHours + 'h';
    if (diffDays < 7) return diffDays + 'd';
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  // Cast posts to SocialPost[] from types/grid
  const typedPosts = posts as SocialPost[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setPlatform(undefined)}
          className={!platform ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-[#04D9FF]/20 text-[#04D9FF] border border-[#04D9FF]' : 'px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-[#808080] border border-transparent'}
        >
          All
        </button>
        {(Object.keys(platformColors) as SocialPlatform[]).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={platform === p ? 'px-3 py-1.5 rounded-lg text-sm font-medium border ' + platformColors[p] : 'px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-[#808080] border border-transparent'}
          >
            {platformIcons[p]} {p}
          </button>
        ))}
      </div>

      {loading && typedPosts.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-[#1E1E1E]/60 border border-white/10 rounded-xl animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-4 bg-white/10 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : typedPosts.length > 0 ? (
        <React.Fragment>
          <div className="space-y-4">
            {typedPosts.map((post) => {
              const colors = platformColors[post.platform] || platformColors.FARCASTER;
              const icon = platformIcons[post.platform] || '🟣';
              
              // Safely access optional properties
              const avatarUrl = post.authorAvatar;
              const displayName = post.authorDisplayName || post.authorUsername || 'Anonymous';
              const username = post.authorUsername;
              const channel = post.channelName;
              const likesCount = post.likes ?? 0;
              const repostsCount = post.reposts ?? 0;
              const repliesCount = post.replies ?? 0;
              const linkUrl = post.externalUrl || post.url;
              
              return (
                <article key={post.id} className="p-4 bg-[#1E1E1E]/60 border border-white/10 rounded-xl hover:border-[#04D9FF]/20 transition-colors">
                  <div className="flex items-start gap-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full border border-white/20" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#04D9FF] to-[#FB48C4] flex items-center justify-center text-white font-bold">
                        {displayName[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white truncate">{displayName}</span>
                        {username && <span className="text-[#808080] text-sm">@{username}</span>}
                        <span className={'px-1.5 py-0.5 rounded text-xs border ' + colors}>{icon} {post.platform}</span>
                        <span className="text-[#808080] text-xs">{formatDate(post.timestamp)}</span>
                      </div>
                      <p className="text-white mt-2 whitespace-pre-wrap break-words">{post.content}</p>
                      {channel && (
                        <div className="mt-2">
                          <span className="text-[#04D9FF] text-sm">#{channel}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-6 mt-3 text-[#808080]">
                        <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" />{likesCount}</span>
                        <span className="flex items-center gap-1.5"><Repeat2 className="w-4 h-4" />{repostsCount}</span>
                        <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" />{repliesCount}</span>
                        {linkUrl && (
                          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#04D9FF] ml-auto">
                            <ExternalLink className="w-4 h-4" />
                            <span className="text-sm">View</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </React.Fragment>
      ) : (
        <div className="text-center py-12 text-[#808080]">
          <p>No posts found</p>
        </div>
      )}
    </div>
  );
}

export default SocialWall;
