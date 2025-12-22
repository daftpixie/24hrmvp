'use client';

import React, { useState } from 'react';
import { useForumThread, usePostMutations } from '@/hooks/useGrid';
import type { ForumPost } from '@/lib/api/grid';
import { ChevronUp, ChevronDown, MessageCircle, Reply, Loader2, AlertCircle } from 'lucide-react';

// Local ForumComment type that matches what useForumThread returns
interface ForumComment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  score: number;
  parentId: string | null;
  replyCount?: number;
  replies?: ForumComment[];
  userVote?: number;
}

interface ThreadedDiscussionProps {
  slug: string;
}

export function ThreadedDiscussion({ slug }: ThreadedDiscussionProps) {
  const { post, comments, loading, error, refresh } = useForumThread(slug);
  const { voteOnPost } = usePostMutations();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return date.toLocaleDateString();
  };

  const handleVote = async (postId: string, value: 1 | -1) => {
    try {
      await voteOnPost(postId, value);
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  const renderReply = (reply: ForumComment, depth: number = 0) => {
    const maxDepth = 4;
    const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : '';
    
    return (
      <div key={reply.id} className={indentClass}>
        <div className="p-4 bg-[#1E1E1E]/40 border border-white/5 rounded-lg mb-2 hover:border-white/10 transition-colors">
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => handleVote(reply.id, 1)}
                className={reply.userVote === 1 ? 'p-1 text-[#04D9FF]' : 'p-1 text-[#808080] hover:text-white'}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className={reply.score > 0 ? 'text-xs font-mono text-[#04D9FF]' : reply.score < 0 ? 'text-xs font-mono text-red-400' : 'text-xs font-mono text-[#808080]'}>
                {reply.score}
              </span>
              <button
                onClick={() => handleVote(reply.id, -1)}
                className={reply.userVote === -1 ? 'p-1 text-red-400' : 'p-1 text-[#808080] hover:text-white'}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-[#808080] mb-2">
                <img
                  src={reply.author?.pfpUrl || '/default-avatar.png'}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
                <span className="font-medium text-white">{reply.author?.username || 'Anonymous'}</span>
                <span>·</span>
                <span>{formatDate(reply.createdAt)}</span>
              </div>

              <p className="text-[#B0B0B0] text-sm whitespace-pre-wrap">{reply.content}</p>

              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                  className="flex items-center gap-1 text-xs text-[#808080] hover:text-[#04D9FF] transition-colors"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
              </div>

              {replyingTo === reply.id && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg">
                  <textarea
                    placeholder="Write a reply..."
                    className="w-full p-2 bg-transparent border border-white/10 rounded text-white text-sm resize-none focus:outline-none focus:border-[#04D9FF]"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="px-3 py-1 text-xs text-[#808080] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button className="px-3 py-1 text-xs bg-[#04D9FF] text-black rounded font-medium hover:bg-[#04D9FF]/80">
                      Post Reply
                    </button>
                  </div>
                </div>
              )}

              {/* Render nested replies */}
              {reply.replies && reply.replies.length > 0 && depth < maxDepth && (
                <div className="mt-3 space-y-2">
                  {reply.replies.map((nestedReply) => renderReply(nestedReply, depth + 1))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !post) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#04D9FF]" />
        <p className="text-[#808080] mt-2">Loading discussion...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-8 text-center text-[#808080]">
        <p>Post not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <article className="p-6 bg-[#1E1E1E]/60 border border-white/10 rounded-xl">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleVote(post.id, 1)}
              className={post.userVote === 1 ? 'p-2 text-[#04D9FF]' : 'p-2 text-[#808080] hover:text-white'}
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <span className={post.score > 0 ? 'font-mono font-bold text-[#04D9FF]' : post.score < 0 ? 'font-mono font-bold text-red-400' : 'font-mono font-bold text-[#808080]'}>
              {post.score}
            </span>
            <button
              onClick={() => handleVote(post.id, -1)}
              className={post.userVote === -1 ? 'p-2 text-red-400' : 'p-2 text-[#808080] hover:text-white'}
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">{post.title || 'Untitled'}</h1>
            
            <div className="flex items-center gap-3 text-sm text-[#808080] mb-4">
              <img
                src={post.author?.pfpUrl || '/default-avatar.png'}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-white">{post.author?.username || 'Anonymous'}</span>
              <span>·</span>
              <span>{formatDate(post.createdAt)}</span>
              <span>·</span>
              <span>{post.viewCount || 0} views</span>
            </div>

            <div className="text-[#B0B0B0] whitespace-pre-wrap">{post.content}</div>
          </div>
        </div>
      </article>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[#04D9FF]" />
          {comments.length} Replies
        </h2>
      </div>

      {comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map((reply) => renderReply(reply as ForumComment))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#808080]">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No replies yet. Be the first to respond!</p>
        </div>
      )}
    </div>
  );
}

export default ThreadedDiscussion;
