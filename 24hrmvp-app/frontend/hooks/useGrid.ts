// ============================================
// 24HRMVP - USE GRID HOOK
// File: frontend/hooks/useGrid.ts
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/config';

import type {
  LeaderboardParams,
  LeaderboardEntry,
  LeaderboardResponse,
  ForumPost,
  ForumComment,
  SocialPost,
  SocialPlatform,
  TrendingChannel,
  GridStats,
  FarcasterChannel,
} from '@/lib/types/grid';

// Re-export types
export type {
  LeaderboardParams,
  LeaderboardEntry,
  ForumPost,
  ForumComment,
  SocialPost,
  SocialPlatform,
  FarcasterChannel,
};

// ============================================
// API HELPER FUNCTIONS
// ============================================

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

// ============================================
// LEADERBOARD API
// ============================================

async function getLeaderboard(
  params: LeaderboardParams = {},
): Promise<LeaderboardResponse & { userRank?: number | null }> {
  const apiUrl = getApiUrl();
  const searchParams = new URLSearchParams();

  if (params.metric) searchParams.set('metric', params.metric);
  if (params.timeframe) searchParams.set('timeframe', params.timeframe);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();

  const response = await fetch(
    `${apiUrl}/api/leaderboard${query ? `?${query}` : ''}`,
    {
      headers: getAuthHeaders(),
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  const data = await response.json();

  // Normalize entries
  if (data.entries) {
    data.entries = data.entries.map((entry: LeaderboardEntry) => ({
      ...entry,
      score: entry.score ?? entry.value,
      value: entry.value ?? entry.score,
    }));
  }

  return data;
}

// ============================================
// FORUM API
// ============================================

export interface ForumFeedParams {
  sort?: 'hot' | 'new' | 'top';
  type?: string;
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
  page?: number;
  limit?: number;
  tags?: string[];
}

interface ForumFeedResponse {
  success: boolean;
  posts: ForumPost[];
  pagination?: {
    page: number;
    pages: number;
    total: number;
  };
}

async function getForumFeed(
  params: ForumFeedParams = {},
): Promise<ForumFeedResponse> {
  const apiUrl = getApiUrl();
  const searchParams = new URLSearchParams();

  if (params.sort) searchParams.set('sort', params.sort);
  if (params.type) searchParams.set('type', params.type);
  if (params.timeframe) searchParams.set('timeframe', params.timeframe);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.tags && params.tags.length > 0) {
    searchParams.set('tags', params.tags.join(','));
  }

  const query = searchParams.toString();

  const response = await fetch(
    `${apiUrl}/api/grid/forum${query ? `?${query}` : ''}`,
    {
      headers: getAuthHeaders(),
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch forum feed');
  }

  return response.json();
}

// ============================================
// SOCIAL FEED API
// ============================================

interface SocialFeedParams {
  platforms?: SocialPlatform[];
  channel?: string;
  limit?: number;
  cursor?: string;
}

interface SocialFeedResponse {
  success: boolean;
  posts: SocialPost[];
  nextCursor?: string | null;
}

async function getSocialFeed(
  params: SocialFeedParams = {},
): Promise<SocialFeedResponse> {
  const apiUrl = getApiUrl();
  const searchParams = new URLSearchParams();

  if (params.platforms && params.platforms.length > 0) {
    searchParams.set('platforms', params.platforms.join(','));
  }
  if (params.channel) searchParams.set('channel', params.channel);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.cursor) searchParams.set('cursor', params.cursor);

  const query = searchParams.toString();

  const response = await fetch(
    `${apiUrl}/api/grid/social/feed${query ? `?${query}` : ''}`,
    {
      headers: getAuthHeaders(),
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch social feed');
  }

  return response.json();
}

// ============================================
// FORUM THREAD API
// ============================================

interface ForumThreadResponse {
  success: boolean;
  post: ForumPost;
  comments: ForumComment[];
}

async function getForumThread(postId: string): Promise<ForumThreadResponse> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/grid/forum/post/${postId}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch forum thread');
  }

  return response.json();
}

interface CreatePostPayload {
  title: string;
  content: string;
  tags?: string[];
  type?: string;
}

interface CreateCommentPayload {
  content: string;
  parentId?: string;
}

async function createForumPost(
  payload: CreatePostPayload,
): Promise<{ success: boolean; post: ForumPost }> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/grid/forum/post`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create post');
  }

  return response.json();
}

async function createForumComment(
  postId: string,
  payload: CreateCommentPayload,
): Promise<{ success: boolean; comment: ForumComment }> {
  const apiUrl = getApiUrl();
  const response = await fetch(
    `${apiUrl}/api/grid/forum/post/${postId}/comment`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to create comment');
  }

  return response.json();
}

async function voteForumPost(
  postId: string,
  value: number,
): Promise<{ success: boolean; score: number; userVote: number }> {
  const apiUrl = getApiUrl();
  const response = await fetch(
    `${apiUrl}/api/grid/forum/post/${postId}/vote`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ value }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to vote on post');
  }

  return response.json();
}

// ============================================
// TRENDING CHANNELS API
// ============================================

interface TrendingChannelsResponse {
  success: boolean;
  channels: TrendingChannel[];
}

async function getTrendingChannels(
  limit: number = 20,
): Promise<TrendingChannelsResponse> {
  const apiUrl = getApiUrl();
  const response = await fetch(
    `${apiUrl}/api/grid/social/channels/trending?limit=${limit}`,
    {
      headers: getAuthHeaders(),
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch trending channels');
  }

  return response.json();
}

// ============================================
// BOOKMARK API
// ============================================

async function bookmarkForumPost(
  postId: string,
): Promise<{ success: boolean; isBookmarked: boolean }> {
  const apiUrl = getApiUrl();
  const response = await fetch(
    `${apiUrl}/api/grid/forum/post/${postId}/bookmark`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to toggle bookmark');
  }

  return response.json();
}

// ============================================
// MAIN GRID HOOK
// ============================================

export function useGrid() {
  const [stats, setStats] = useState<GridStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/grid/stats`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data: { success: boolean; stats: GridStats } =
          await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch grid stats', err);
      setError('Failed to load grid stats');
    }
  }, []);

  useEffect(() => {
    refreshStats().finally(() => setLoading(false));
  }, [refreshStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
  };
}

// ============================================
// LEADERBOARD HOOK
// ============================================

export function useLeaderboard(params: LeaderboardParams = {}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLeaderboard(params);
      setEntries(data.entries || []);
      // userRank might be optional in the response
      setUserRank(data.userRank ?? null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch leaderboard',
      );
    } finally {
      setLoading(false);
    }
  }, [params.metric, params.timeframe, params.limit, params.offset]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, userRank, loading, error, refresh: fetchLeaderboard };
}

// ============================================
// FORUM HOOKS
// ============================================

export function useForumFeed(params: ForumFeedParams = {}) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getForumFeed(params);

      if (data.success) {
        setPosts(data.posts);
        if (data.pagination) {
          setHasMore(data.pagination.page < data.pagination.pages);
          setTotal(data.pagination.total);
        }
      }
    } catch (err) {
      console.error('Error fetching forum feed:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load forum feed',
      );
    } finally {
      setLoading(false);
    }
  }, [
    params.sort,
    params.type,
    params.timeframe,
    params.page,
    params.limit,
    JSON.stringify(params.tags),
  ]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const toggleBookmark = async (postId: string) => {
    try {
      const result = await bookmarkForumPost(postId);

      // Optimistically update UI
      setPosts(current =>
        current.map(post =>
          post.id === postId
            ? { ...post, isBookmarked: result.isBookmarked }
            : post,
        ),
      );

      return result;
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      throw err;
    }
  };

  return {
    posts,
    loading,
    error,
    hasMore,
    total,
    refresh: fetchFeed,
    toggleBookmark,
  };
}

// ============================================
// FORUM THREAD HOOK
// ============================================

export function useForumThread(postId?: string) {
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThread = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getForumThread(postId);
      if (data.success) {
        setPost(data.post);
        setComments(data.comments);
      }
    } catch (err) {
      console.error('Error fetching forum thread:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load forum thread',
      );
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  return {
    post,
    comments,
    loading,
    error,
    refresh: fetchThread,
    setComments,
  };
}

// ============================================
// POST MUTATIONS HOOK
// ============================================

export function usePostMutations(postId?: string) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitPost = useCallback(async (payload: CreatePostPayload) => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      const result = await createForumPost(payload);
      return result.post;
    } catch (err) {
      console.error('Error creating post:', err);
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to create post',
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const submitComment = useCallback(
    async (payload: CreateCommentPayload) => {
      if (!postId) throw new Error('postId is required to create a comment');
      try {
        setSubmitting(true);
        setSubmitError(null);
        const result = await createForumComment(postId, payload);
        return result.comment;
      } catch (err) {
        console.error('Error creating comment:', err);
        setSubmitError(
          err instanceof Error ? err.message : 'Failed to create comment',
        );
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [postId],
  );

  const votePost = useCallback(
    async (value: number) => {
      if (!postId) throw new Error('postId is required to vote');
      try {
        setSubmitting(true);
        setSubmitError(null);
        const result = await voteForumPost(postId, value);
        return result;
      } catch (err) {
        console.error('Error voting on post:', err);
        setSubmitError(
          err instanceof Error ? err.message : 'Failed to vote on post',
        );
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [postId],
  );

  return {
    submitPost,
    submitComment,
    votePost,
    submitting,
    submitError,
  };
}

// ============================================
// SOCIAL FEED HOOK
// ============================================

export function useSocialFeed(params: SocialFeedParams = {}) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(null);

  const fetchFeed = useCallback(
    async (append = false) => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSocialFeed({
          ...params,
          cursor: append ? nextCursor ?? undefined : undefined,
        });
        if (append) {
          setPosts(current => [...current, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        console.error('Error fetching social feed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load social feed',
        );
      } finally {
        setLoading(false);
      }
    },
    [
      params.platforms && params.platforms.join(','),
      params.channel,
      params.limit,
      nextCursor,
    ],
  );

  useEffect(() => {
    fetchFeed(false);
  }, [fetchFeed]);

  const loadMore = () => {
    if (!nextCursor) return;
    return fetchFeed(true);
  };

  return {
    posts,
    loading,
    error,
    nextCursor,
    refresh: () => fetchFeed(false),
    loadMore,
  };
}

// ============================================
// TRENDING CHANNELS HOOK
// ============================================

export function useTrendingChannels(limit: number = 5) {
  const [channels, setChannels] = useState<TrendingChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const data = await getTrendingChannels(limit);
        if (data.success) {
          setChannels(data.channels);
        }
      } catch (err) {
        console.error('Error fetching trending channels:', err);
        setError('Failed to load trending channels');
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [limit]);

  return { channels, loading, error };
}
