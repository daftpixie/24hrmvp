// ============================================
// 24HRMVP - USE GRID HOOK
// File: frontend/hooks/useGrid.ts
// Manages Grid state and data fetching
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLeaderboard, getForumFeed, getTrendingChannels } from '@/lib/api/grid';
import { getApiUrl } from '@/lib/config';
import type { LeaderboardParams } from '@/lib/api/grid';
import type { LeaderboardEntry, ForumPost, ForumComment, FarcasterChannel } from '@/lib/types/grid';

export interface GridStats {
  totalMembers: number;
  activeNow: number;
  totalMessages: number;
  todayActivity: number;
}

export function useGrid() {
  const [stats, setStats] = useState<GridStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentPosts, setRecentPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/grid/stats`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats({
          totalMembers: 0,
          activeNow: 0,
          totalMessages: 0,
          todayActivity: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch Grid stats:', err);
      setStats({
        totalMembers: 0,
        activeNow: 0,
        totalMessages: 0,
        todayActivity: 0
      });
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await getLeaderboard({ 
        metric: 'points', 
        timeframe: 'all',
        limit: 10 
      });
      
      if (response.success && response.entries) {
        setLeaderboard(response.entries);
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      console.error('Failed to fetch Grid leaderboard:', err);
      setLeaderboard([]);
    }
  }, []);

  const fetchRecentPosts = useCallback(async () => {
    try {
      const response = await getForumFeed({ 
        sort: 'new',
        limit: 10 
      });
      
      if (response.success && response.posts) {
        setRecentPosts(response.posts);
      } else {
        setRecentPosts([]);
      }
    } catch (err) {
      console.error('Failed to fetch recent posts:', err);
      setRecentPosts([]);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchStats(),
        fetchLeaderboard(),
        fetchRecentPosts()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Grid data');
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchLeaderboard, fetchRecentPosts]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return {
    stats,
    leaderboard,
    recentPosts,
    loading,
    error,
    refreshStats: fetchStats,
    refreshLeaderboard: fetchLeaderboard,
    refreshPosts: fetchRecentPosts,
    refreshAll
  };
}

// ============================================
// FORUM FEED HOOK
// ============================================

export interface ForumFeedFilters {
  sort?: 'hot' | 'new' | 'top' | 'controversial';
  type?: string;
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
  page?: number;
  limit?: number;
  tags?: string[];
}

export function useForumFeed(initialFilters: ForumFeedFilters = {}) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ForumFeedFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getForumFeed({
        sort: filters.sort || 'hot',
        type: filters.type,
        timeframe: filters.timeframe || 'all',
        page: filters.page || 1,
        limit: filters.limit || 20,
        tags: filters.tags
      });
      
      if (response.success && response.posts) {
        setPosts(response.posts);
        setTotalPages(response.pagination?.pages || 1);
        setCurrentPage(response.pagination?.page || 1);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error('Failed to fetch forum feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const updateFilters = useCallback((newFilters: Partial<ForumFeedFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const goToPage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  const refresh = useCallback(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    filters,
    currentPage,
    totalPages,
    updateFilters,
    goToPage,
    refresh
  };
}

// ============================================
// POST MUTATIONS HOOK
// ============================================

export function usePostMutations() {
  const [creating, setCreating] = useState(false);
  const [voting, setVoting] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(async (data: {
    title: string;
    content: string;
    categoryId?: string;
    tags?: string[];
  }) => {
    setCreating(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/grid/forum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create post');
      }
      
      const result = await res.json();
      return result.post;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  const voteOnPost = useCallback(async (postId: string, value: 1 | -1) => {
    setVoting(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/grid/forum/post/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to vote');
      }
      
      return await res.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote';
      setError(errorMessage);
      throw err;
    } finally {
      setVoting(false);
    }
  }, []);

  const removeVote = useCallback(async (postId: string) => {
    setVoting(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/grid/forum/post/${postId}/vote`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove vote');
      }
      
      return await res.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove vote';
      setError(errorMessage);
      throw err;
    } finally {
      setVoting(false);
    }
  }, []);

  const toggleBookmark = useCallback(async (postId: string, isBookmarked: boolean) => {
    setBookmarking(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const method = isBookmarked ? 'DELETE' : 'POST';
      const res = await fetch(`${apiUrl}/api/grid/forum/post/${postId}/bookmark`, {
        method,
        credentials: 'include',
        ...(method === 'POST' && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to toggle bookmark');
      }
      
      return await res.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle bookmark';
      setError(errorMessage);
      throw err;
    } finally {
      setBookmarking(false);
    }
  }, []);

  return {
    createPost,
    voteOnPost,
    removeVote,
    toggleBookmark,
    creating,
    voting,
    bookmarking,
    error
  };
}

// ============================================
// LEADERBOARD HOOK
// ============================================

export type LeaderboardType = 'points' | 'submissions' | 'votes' | 'forum_score' | 'achievements';
export type MetricType = LeaderboardType;
export type TimeframeType = 'day' | 'week' | 'month' | 'year' | 'all';

export interface LeaderboardOptions {
  metric?: MetricType;
  timeframe?: TimeframeType;
  limit?: number;
}

export function useLeaderboard(options: LeaderboardOptions = {}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getLeaderboard({
        metric: options.metric || 'points',
        timeframe: options.timeframe || 'all',
        limit: options.limit || 50
      });

      if (response.success && response.entries) {
        setEntries(response.entries);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [options.metric, options.timeframe, options.limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    entries,
    loading,
    error,
    refresh: fetchLeaderboard
  };
}

// ============================================
// FORUM THREAD HOOK
// ============================================

export function useForumThread(slug: string) {
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/grid/forum/thread/${slug}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPost(data.post);
          setComments(data.comments || []);
        }
      } else {
        setError('Failed to load thread');
      }
    } catch (err) {
      console.error('Failed to fetch thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  return {
    post,
    comments,
    loading,
    error,
    refresh: fetchThread
  };
}

// ============================================
// SOCIAL FEED HOOKS
// ============================================

export interface SocialPost {
  id: string;
  platform: 'FARCASTER' | 'TWITTER' | 'INSTAGRAM' | 'TIKTOK';
  externalId: string;
  authorFid?: number;
  authorUsername?: string;
  content: string;
  timestamp: string;
  url?: string;
  mediaUrls?: string[];
  channelId?: string;
  hashtags?: string[];
  isFeatured: boolean;
  createdAt: string;
}

export interface SocialFeedOptions {
  platform?: 'FARCASTER' | 'TWITTER' | 'INSTAGRAM' | 'TIKTOK' | 'all';
  channelId?: string;
  limit?: number;
}

export function useSocialFeed(options: SocialFeedOptions = {}) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const params = new URLSearchParams();
      if (options.platform && options.platform !== 'all') params.set('platform', options.platform);
      if (options.channelId) params.set('channelId', options.channelId);
      if (options.limit) params.set('limit', options.limit.toString());

      const res = await fetch(`${apiUrl}/api/grid/social?${params}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPosts(data.posts || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch social feed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [options.platform, options.channelId, options.limit]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return {
    posts,
    loading,
    error,
    refresh: fetchFeed
  };
}

export function useTrendingSocial(limit: number = 10) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/grid/social/trending?limit=${limit}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPosts(data.posts || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trending:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trending');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return {
    posts,
    loading,
    error,
    refresh: fetchTrending
  };
}

// ============================================
// FARCASTER CHANNELS HOOK
// ============================================

export function useFarcasterChannels(limit: number = 20) {
  const [channels, setChannels] = useState<FarcasterChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTrendingChannels(limit);
      
      if (response.success && response.channels) {
        // Transform to FarcasterChannel interface
        const transformedChannels: FarcasterChannel[] = response.channels.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          description: ch.description,
          imageUrl: ch.imageUrl || ch.image_url,
          followerCount: ch.follower_count || ch.followerCount || 0,
          url: ch.url,
        }));
        setChannels(transformedChannels);
      } else {
        setChannels([]);
      }
    } catch (err) {
      console.error('Failed to fetch Farcaster channels:', err);
      setError(err instanceof Error ? err.message : 'Failed to load channels');
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return {
    channels,
    loading,
    error,
    refresh: fetchChannels
  };
}
