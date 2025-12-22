'use client';

/**
 * ThreadedDiscussion Component for 24HRMVP
 * 
 * @version 5.0.0
 */

import React, { useMemo, useState } from 'react';
import {
  useForumThread,
  usePostMutations,
} from '@/hooks/useGrid';
import type { ForumComment } from '@/lib/types/grid';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';

interface ThreadedDiscussionProps {
  postId: string;
}

function formatDate(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export default function ThreadedDiscussion({ postId }: ThreadedDiscussionProps) {
  const { post, comments, loading, error, refresh } = useForumThread(postId);
  const { submitComment, votePost, submitting } = usePostMutations(postId);

  const [replyContent, setReplyContent] = useState('');
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  const topLevelComments = useMemo(
    () => comments.filter(comment => !comment.parentId),
    [comments],
  );

  const groupedReplies = useMemo(() => {
    const map: Record<string, ForumComment[]> = {};
    comments.forEach(comment => {
      if (comment.parentId) {
        if (!map[comment.parentId]) map[comment.parentId] = [];
        map[comment.parentId].push(comment);
      }
    });
    return map;
  }, [comments]);

  const handleVote = async (id: string, value: number) => {
    if (!post) return;
    await votePost(value);
    refresh();
  };

  const handleReplySubmit = async (parentId?: string) => {
    if (!replyContent.trim()) return;
    await submitComment({
      content: replyContent.trim(),
      parentId,
    });
    setReplyContent('');
    setActiveParentId(null);
    refresh();
  };

  const renderReply = (reply: ForumComment) => {
    const replies = groupedReplies[reply.id] || [];
    return (
      <div key={reply.id} className="ml-8 mt-4 border-l border-[#222] pl-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleVote(reply.id, 1)}
              className={cn(
                'p-1 text-[#808080] hover:text-white',
                reply.userVote === 1 && 'text-[#04D9FF]',
              )}
            >
              <ArrowBigUp className="h-4 w-4" />
            </button>
            <span
              className={cn(
                'font-mono text-xs font-bold',
                reply.score > 0 && 'text-[#04D9FF]',
                reply.score < 0 && 'text-red-400',
                reply.score === 0 && 'text-[#808080]',
              )}
            >
              {reply.score}
            </span>
            <button
              onClick={() => handleVote(reply.id, -1)}
              className={cn(
                'p-1 text-[#808080] hover:text-white',
                reply.userVote === -1 && 'text-red-400',
              )}
            >
              <ArrowBigDown className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#808080]">
              <span className="font-mono text-[#E2E8F0]">
                {reply.author?.username || 'Anonymous'}
              </span>
              <span>·</span>
              <span>{formatDate(reply.createdAt)}</span>
            </div>
            <p className="text-sm text-[#E2E8F0] whitespace-pre-wrap">
              {reply.content}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                className="h-7 px-2 text-xs text-[#808080] hover:text-[#E2E8F0]"
                onClick={() =>
                  setActiveParentId(
                    activeParentId === reply.id ? null : reply.id,
                  )
                }
              >
                <MessageCircle className="mr-1 h-3 w-3" />
                Reply
              </Button>
            </div>
            {activeParentId === reply.id && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyContent(e.target.value)}
                  placeholder="Reply to this comment..."
                  className="min-h-[80px] resize-none bg-black/40 text-sm text-[#E2E8F0]"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={submitting}
                    onClick={() => {
                      setActiveParentId(null);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={submitting || !replyContent.trim()}
                    onClick={() => handleReplySubmit(reply.id)}
                  >
                    {submitting ? 'Posting...' : 'Post reply'}
                  </Button>
                </div>
              </div>
            )}
            {replies.length > 0 && (
              <div className="mt-2 space-y-2">
                {replies.map((child: ForumComment) => renderReply(child))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && !post) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-[#808080]">
        Loading thread...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-[#808080]">
        <p>{error || 'Thread not found.'}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          className="border-[#333] bg-black/40 text-xs text-[#E2E8F0] hover:bg-black/60"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-[#1F2933] bg-[#020617]/80 p-4 backdrop-blur">
      {/* Post header */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => handleVote(post.id, 1)}
            className={cn(
              'p-2 text-[#808080] hover:text-white',
              post.userVote === 1 && 'text-[#04D9FF]',
            )}
          >
            <ArrowBigUp className="h-5 w-5" />
          </button>
          <span
            className={cn(
              'font-mono text-sm font-bold',
              post.score > 0 && 'text-[#04D9FF]',
              post.score < 0 && 'text-red-400',
              post.score === 0 && 'text-[#808080]',
            )}
          >
            {post.score}
          </span>
          <button
            onClick={() => handleVote(post.id, -1)}
            className={cn(
              'p-2 text-[#808080] hover:text-white',
              post.userVote === -1 && 'text-red-400',
            )}
          >
            <ArrowBigDown className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#808080]">
            <span className="rounded-full border border-[#27272A] bg-black/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#A5B4FC]">
              {post.type || 'Discussion'}
            </span>
            <span className="font-mono text-[#E2E8F0]">
              {post.author?.username || 'Anonymous'}
            </span>
            <span>·</span>
            <span>{formatDate(post.createdAt)}</span>
            {post.viewCount != null && (
              <>
                <span>·</span>
                <span>{post.viewCount} views</span>
              </>
            )}
          </div>
          <h2 className="text-lg font-semibold text-[#F9FAFB]">
            {post.title || 'Untitled'}
          </h2>
          <p className="text-sm leading-relaxed text-[#E2E8F0] whitespace-pre-wrap">
            {post.content}
          </p>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#808080]">
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{comments.length} replies</span>
            </div>
            <button className="inline-flex items-center gap-1 text-xs text-[#808080] hover:text-[#E2E8F0]">
              <Bookmark className="h-3 w-3" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* New comment box */}
      <div className="space-y-3 rounded-xl border border-[#1F2933] bg-black/40 p-3">
        <Textarea
          value={replyContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyContent(e.target.value)}
          placeholder="Share your thoughts..."
          className="min-h-[80px] resize-none bg-black/40 text-sm text-[#E2E8F0]"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#6B7280]">
            Be respectful. Constructive feedback moves the grid forward.
          </span>
          <Button
            size="sm"
            disabled={submitting || !replyContent.trim()}
            onClick={() => handleReplySubmit()}
          >
            {submitting ? 'Posting...' : 'Post comment'}
          </Button>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        {topLevelComments.length === 0 ? (
          <p className="text-center text-xs text-[#6B7280]">
            No replies yet. Start the conversation.
          </p>
        ) : (
          topLevelComments.map((comment: ForumComment) => {
            const replies = groupedReplies[comment.id] || [];
            return (
              <div key={comment.id} className="border-t border-[#111827] pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleVote(comment.id, 1)}
                      className={cn(
                        'p-1 text-[#808080] hover:text-white',
                        comment.userVote === 1 && 'text-[#04D9FF]',
                      )}
                    >
                      <ArrowBigUp className="h-4 w-4" />
                    </button>
                    <span
                      className={cn(
                        'font-mono text-xs font-bold',
                        comment.score > 0 && 'text-[#04D9FF]',
                        comment.score < 0 && 'text-red-400',
                        comment.score === 0 && 'text-[#808080]',
                      )}
                    >
                      {comment.score}
                    </span>
                    <button
                      onClick={() => handleVote(comment.id, -1)}
                      className={cn(
                        'p-1 text-[#808080] hover:text-white',
                        comment.userVote === -1 && 'text-red-400',
                      )}
                    >
                      <ArrowBigDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#808080]">
                      <span className="font-mono text-[#E2E8F0]">
                        {comment.author?.username || 'Anonymous'}
                      </span>
                      <span>·</span>
                      <span>{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-[#E2E8F0] whitespace-pre-wrap">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 px-2 text-xs text-[#808080] hover:text-[#E2E8F0]"
                        onClick={() =>
                          setActiveParentId(
                            activeParentId === comment.id ? null : comment.id,
                          )
                        }
                      >
                        <MessageCircle className="mr-1 h-3 w-3" />
                        Reply
                      </Button>
                    </div>
                    {activeParentId === comment.id && (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={replyContent}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyContent(e.target.value)}
                          placeholder="Reply to this comment..."
                          className="min-h-[80px] resize-none bg-black/40 text-sm text-[#E2E8F0]"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={submitting}
                            onClick={() => {
                              setActiveParentId(null);
                              setReplyContent('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={submitting || !replyContent.trim()}
                            onClick={() => handleReplySubmit(comment.id)}
                          >
                            {submitting ? 'Posting...' : 'Post reply'}
                          </Button>
                        </div>
                      </div>
                    )}
                    {replies.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {replies.map((reply: ForumComment) => renderReply(reply))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
