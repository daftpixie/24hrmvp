'use client';

/**
 * SocialWall Component for 24HRMVP
 * 
 * @version 5.0.0 - Added named export for compatibility
 * 
 * Supports BOTH import styles:
 * - import { SocialWall } from '@/components/grid/SocialWall'
 * - import SocialWall from '@/components/grid/SocialWall'
 */

import React from 'react';
import { useSocialFeed } from '@/hooks/useGrid';
import type { SocialPost } from '@/lib/types/grid';
import { formatDistanceToNow } from 'date-fns';
import { Globe, Link2, MessageCircle, Repeat2, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SocialWallProps {
  channel?: string;
  limit?: number;
}

// Define a local interface to extend the potentially missing properties
// from the imported SocialPost type, ensuring type safety in this component.
interface SafeSocialPost extends SocialPost {
  author?: {
    displayName?: string;
    username?: string;
    avatarUrl?: string;
  };
  likesCount?: number;
  repostsCount?: number;
  repliesCount?: number;
  linkUrl?: string;
  channel?: string;
}

function formatDate(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'warpcast':
    case 'farcaster':
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7C3AED] text-[10px] font-bold text-white">
          FC
        </div>
      );
    case 'x':
    case 'twitter':
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
          X
        </div>
      );
    default:
      return <Globe className="h-4 w-4 text-[#9CA3AF]" />;
  }
}

// Named export for `import { SocialWall } from ...`
export function SocialWall({ channel, limit = 20 }: SocialWallProps) {
  const { posts, loading, error, loadMore, nextCursor } = useSocialFeed({
    channel,
    limit,
  });

  const renderPost = (rawPost: SocialPost) => {
    // Cast to our safe type to access properties that might be missing in the global type definition
    const post = rawPost as SafeSocialPost;
    
    const {
      id,
      platform,
      author,
      content,
      timestamp,
      likesCount,
      repostsCount,
      repliesCount,
      linkUrl,
      channel: postChannel,
    } = post;

    const displayName = author?.displayName || author?.username || 'Anon';
    const username = author?.username;
    const avatarUrl = author?.avatarUrl;
    const icon = getPlatformIcon(platform);

    return (
      <article
        key={id}
        className="group rounded-2xl border border-[#1F2933] bg-gradient-to-b from-[#020617]/90 to-black/90 p-4 shadow-[0_0_40px_rgba(15,23,42,0.7)] transition hover:border-[#4C51BF] hover:shadow-[0_0_40px_rgba(79,70,229,0.85)]"
      >
        <div className="flex gap-3">
          <div className="mt-1 flex flex-col items-center gap-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#4C51BF] via-[#EC4899] to-[#22D3EE] p-[1px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#020617]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-[#E5E7EB]">
                    {displayName[0].toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#1F2933] bg-black/80">
              {icon}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
              <span className="truncate text-[13px] font-medium text-[#F9FAFB]">
                {displayName}
              </span>
              {username && (
                <span className="truncate text-[11px] text-[#6B7280]">
                  @{username}
                </span>
              )}
              <span className="text-[#4B5563]">·</span>
              <span className="text-[11px]">{formatDate(timestamp)}</span>
              {postChannel && (
                <span className="rounded-full border border-[#111827] bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#6EE7B7]">
                  #{postChannel}
                </span>
              )}
              <span className="ml-auto rounded-full border border-[#1F2933] bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#A5B4FC]">
                {platform}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#E5E7EB] whitespace-pre-wrap">
              {content}
            </p>
            <div className="flex items-center gap-4 text-xs text-[#6B7280]">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{likesCount ?? 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Repeat2 className="h-3.5 w-3.5" />
                <span>{repostsCount ?? 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{repliesCount ?? 0}</span>
              </div>
              {linkUrl && (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#60A5FA] hover:text-[#93C5FD]"
                >
                  <Link2 className="h-3 w-3" />
                  View
                </a>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-[#808080]">
        Loading social feed...
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => renderPost(post))}
      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMore()}
            className={cn(
              'border-[#27272A] bg-black/40 text-xs text-[#E5E7EB] hover:border-[#4C51BF] hover:bg-black/80',
            )}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

// Default export for backwards compatibility
export default SocialWall;
