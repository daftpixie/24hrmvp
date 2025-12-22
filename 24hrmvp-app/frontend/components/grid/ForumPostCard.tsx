'use client';

/**
 * ForumPostCard Component for 24HRMVP
 * 
 * @version 5.1.0 - Fixed Button import casing
 */

import React from 'react';
import type { ForumPost } from '@/lib/types/grid';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Bookmark, MessageCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
// FIXED: Using consistent casing - Button.tsx with capital B
import { Button } from '@/components/ui/Button';
import { useForumFeed } from '@/hooks/useGrid';

interface ForumPostCardProps {
  post: ForumPost;
  onBookmarkToggle?: (postId: string) => Promise<void> | void;
}

function formatDate(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export default function ForumPostCard({
  post,
  onBookmarkToggle,
}: ForumPostCardProps) {
  const router = useRouter();
  const { toggleBookmark } = useForumFeed();

  const handleOpen = () => {
    router.push(`/grid/forum/${post.id}`);
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBookmarkToggle) {
      await onBookmarkToggle(post.id);
    } else {
      await toggleBookmark(post.id);
    }
  };

  // Safely access comment count from possible properties
  const commentCount =
    (post as any).commentCount ?? (post as any)._count?.comments ?? 0;

  return (
    <article
      onClick={handleOpen}
      className="group cursor-pointer rounded-2xl border border-[#1F2933] bg-gradient-to-b from-[#020617]/90 to-black/90 p-4 shadow-[0_0_40px_rgba(15,23,42,0.7)] transition hover:border-[#4C51BF] hover:shadow-[0_0_40px_rgba(79,70,229,0.85)]"
    >
      {/* Meta info */}
      <div className="mb-2 flex items-center gap-2 text-xs text-[#9CA3AF]">
        <span className="rounded-full border border-[#27272A] bg-black/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#A5B4FC]">
          {post.type || 'Discussion'}
        </span>
        <span className="font-mono text-[11px] text-[#E5E7EB]">
          {post.author?.username || 'Anonymous'}
        </span>
        <span className="text-[#4B5563]">·</span>
        <span className="text-[11px]">
          {formatDate(post.createdAt || post.updatedAt || new Date())}
        </span>
        {post.viewCount != null && (
          <>
            <span className="text-[#4B5563]">·</span>
            <span className="text-[11px]">{post.viewCount} views</span>
          </>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-[#F9FAFB]">
        {post.title || 'Untitled Post'}
      </h3>

      {/* Content preview */}
      {post.content && (
        <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-[#D1D5DB]">
          {post.content.slice(0, 200)}
          {post.content.length > 200 && '...'}
        </p>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {post.tags.map(tag => (
            <span
              key={tag}
              className="rounded-full border border-[#111827] bg-[#020617] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#6EE7B7]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 text-xs text-[#6B7280]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-[#22D3EE]" />
            <span className="font-mono text-[11px] text-[#E5E7EB]">
              {post.score ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            <span className="text-[11px]">{commentCount} replies</span>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'h-7 w-7 rounded-full border border-transparent text-[#6B7280] hover:border-[#4C51BF] hover:bg-black/60 hover:text-[#E5E7EB]',
            post.isBookmarked && 'border-[#4C51BF] bg-black/60 text-[#E5E7EB]',
          )}
          onClick={handleBookmark}
        >
          <Bookmark
            className={cn(
              'h-3.5 w-3.5',
              post.isBookmarked && 'fill-[#4C51BF] text-[#4C51BF]',
            )}
          />
        </Button>
      </div>
    </article>
  );
}
