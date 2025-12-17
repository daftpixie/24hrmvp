'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown, MessageCircle, Bookmark, Clock, Eye } from 'lucide-react';
import { usePostMutations } from '@/hooks/useGrid';
import type { ForumPost, PostType } from '@/lib/types/grid';

// Post type configuration with icons and colors
const postTypeConfig: Record<PostType, { color: string; icon: string; label: string }> = {
  DISCUSSION: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '💬', label: 'Discussion' },
  QUESTION: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '❓', label: 'Question' },
  SHOWCASE: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🚀', label: 'Showcase' },
  FEEDBACK: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '📝', label: 'Feedback' },
  ANNOUNCEMENT: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '📢', label: 'Announcement' },
};

interface ForumPostCardProps {
  post: ForumPost;
  showContent?: boolean;
  onClick?: () => void;
}

export const ForumPostCard: React.FC<ForumPostCardProps> = ({
  post,
  showContent = true,
  onClick,
}) => {
  const { voteOnPost, toggleBookmark } = usePostMutations();
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [currentScore, setCurrentScore] = useState(post.score);
  const [userVote, setUserVote] = useState<number | null>(post.userVote ?? null);

  // Safely get type config with fallback
  const typeConfig = postTypeConfig[post.type as PostType] || postTypeConfig.DISCUSSION;

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleVote = async (value: 1 | -1) => {
    try {
      const newVote = userVote === value ? 0 : value;
      const scoreDiff = newVote - (userVote || 0);
      
      setUserVote(newVote === 0 ? null : newVote);
      setCurrentScore(prev => prev + scoreDiff);
      
      if (newVote === 0) {
        // Remove vote - would need unvote function
      } else {
        await voteOnPost(post.id, value);
      }
    } catch (err) {
      // Revert on error
      setUserVote(post.userVote ?? null);
      setCurrentScore(post.score);
      console.error('Vote failed:', err);
    }
  };

  const handleBookmark = async () => {
    try {
      const newBookmarkState = !isBookmarked;
      setIsBookmarked(newBookmarkState);
      await toggleBookmark(post.id, newBookmarkState);
    } catch (err) {
      setIsBookmarked(isBookmarked);
      console.error('Bookmark failed:', err);
    }
  };

  return (
    <article className="p-4 bg-[#1E1E1E]/60 border border-white/10 rounded-xl hover:border-[#04D9FF]/30 transition-all duration-200">
      <div className="flex gap-4">
        {/* Vote Column */}
        <div className="flex flex-col items-center gap-1 min-w-[40px]">
          <button
            onClick={() => handleVote(1)}
            className={`p-1 rounded hover:bg-white/10 transition-colors ${
              userVote === 1 ? 'text-[#04D9FF]' : 'text-[#808080] hover:text-white'
            }`}
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <span className={`font-mono font-bold text-sm ${
            currentScore > 0 ? 'text-[#04D9FF]' : currentScore < 0 ? 'text-red-400' : 'text-[#808080]'
          }`}>
            {currentScore}
          </span>
          <button
            onClick={() => handleVote(-1)}
            className={`p-1 rounded hover:bg-white/10 transition-colors ${
              userVote === -1 ? 'text-red-400' : 'text-[#808080] hover:text-white'
            }`}
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <Link 
                href={`/grid/forum/post/${post.slug}`}
                className="block"
                onClick={onClick}
              >
                <h3 className="text-lg font-semibold text-white hover:text-[#04D9FF] transition-colors line-clamp-2">
                  {post.title || 'Untitled Post'}
                </h3>
              </Link>
              
              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#808080]">
                <span className={`px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
                  {typeConfig.icon} {typeConfig.label}
                </span>
                <span className="flex items-center gap-1">
                  <img 
                    src={post.author?.pfpUrl || '/default-avatar.png'} 
                    alt="" 
                    className="w-4 h-4 rounded-full"
                  />
                  {post.author?.username || 'Anonymous'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(post.createdAt)}
                </span>
                {post.viewCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {post.viewCount}
                  </span>
                )}
              </div>
            </div>

            {/* Bookmark button */}
            <button
              onClick={handleBookmark}
              className={`p-2 rounded-lg transition-colors ${
                isBookmarked 
                  ? 'text-[#04D9FF] bg-[#04D9FF]/10' 
                  : 'text-[#808080] hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Content preview */}
          {showContent && post.content && (
            <p className="text-[#B0B0B0] text-sm line-clamp-2 mb-3">
              {post.content.slice(0, 200)}
              {post.content.length > 200 && '...'}
            </p>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-white/5 text-[#808080] rounded-full hover:bg-white/10 cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
              {post.tags.length > 5 && (
                <span className="px-2 py-0.5 text-xs text-[#808080]">
                  +{post.tags.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* Footer stats */}
          <div className="flex items-center gap-4 text-xs text-[#808080]">
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {post.replyCount || post._count?.replies || 0} replies
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ForumPostCard;