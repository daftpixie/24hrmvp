// ============================================
// 24HRMVP - USE FORUM FEED HOOK
// File: frontend/hooks/useForumFeed.ts
// Forum feed data fetching hook
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { ForumPost, ForumFeedResponse } from '@/lib/types/grid';

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
      const params = new URLSearchParams();
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.type) params.set('type', filters.type);
      if (filters.timeframe) params.set('timeframe', filters.timeframe);
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.limit) params.set('limit', filters.limit.toString());
      if (filters.tags?.length) params.set('tags', filters.tags.join(','));

      const queryString = params.toString();
      const endpoint = `/api/grid/forum${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<ForumFeedResponse>(endpoint);
      
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

export default useForumFeed;
