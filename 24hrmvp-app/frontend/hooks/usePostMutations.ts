// ============================================
// 24HRMVP - USE POST MUTATIONS HOOK
// File: frontend/hooks/usePostMutations.ts
// Forum post mutation operations
// ============================================

'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { ForumPost } from '@/lib/types/grid';

export interface CreatePostData {
  title: string;
  content: string;
  type?: string;
  categoryId?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  tags?: string[];
  [key: string]: unknown;
}

export function usePostMutations() {
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [voting, setVoting] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(async (data: CreatePostData): Promise<ForumPost> => {
    setCreating(true);
    setError(null);
    try {
      const response = await apiClient.post<{ success: boolean; post: ForumPost }>(
        '/api/grid/forum',
        data
      );
      if (!response.success) {
        throw new Error('Failed to create post');
      }
      return response.post;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  const updatePost = useCallback(async (slug: string, data: UpdatePostData): Promise<ForumPost> => {
    setUpdating(true);
    setError(null);
    try {
      const response = await apiClient.put<{ success: boolean; post: ForumPost }>(
        `/api/grid/forum/post/${slug}`,
        data
      );
      if (!response.success) {
        throw new Error('Failed to update post');
      }
      return response.post;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update post';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  const deletePost = useCallback(async (slug: string): Promise<void> => {
    setDeleting(true);
    setError(null);
    try {
      const response = await apiClient.delete<{ success: boolean }>(
        `/api/grid/forum/post/${slug}`
      );
      if (!response.success) {
        throw new Error('Failed to delete post');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete post';
      setError(errorMessage);
      throw err;
    } finally {
      setDeleting(false);
    }
  }, []);

  const voteOnPost = useCallback(async (
    postId: string,
    value: 1 | -1
  ): Promise<{ score: number; userVote: number }> => {
    setVoting(true);
    setError(null);
    try {
      const response = await apiClient.post<{ success: boolean; score: number; userVote: number }>(
        `/api/grid/forum/post/${postId}/vote`,
        { value }
      );
      if (!response.success) {
        throw new Error('Failed to vote');
      }
      return { score: response.score, userVote: response.userVote };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote';
      setError(errorMessage);
      throw err;
    } finally {
      setVoting(false);
    }
  }, []);

  const removeVote = useCallback(async (postId: string): Promise<{ score: number }> => {
    setVoting(true);
    setError(null);
    try {
      const response = await apiClient.delete<{ success: boolean; score: number }>(
        `/api/grid/forum/post/${postId}/vote`
      );
      if (!response.success) {
        throw new Error('Failed to remove vote');
      }
      return { score: response.score };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove vote';
      setError(errorMessage);
      throw err;
    } finally {
      setVoting(false);
    }
  }, []);

  const toggleBookmark = useCallback(async (postId: string, isBookmarked: boolean): Promise<void> => {
    setBookmarking(true);
    setError(null);
    try {
      if (isBookmarked) {
        await apiClient.delete<{ success: boolean }>(
          `/api/grid/forum/post/${postId}/bookmark`
        );
      } else {
        await apiClient.post<{ success: boolean }>(
          `/api/grid/forum/post/${postId}/bookmark`,
          {}
        );
      }
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
    updatePost,
    deletePost,
    voteOnPost,
    removeVote,
    toggleBookmark,
    creating,
    updating,
    deleting,
    voting,
    bookmarking,
    error,
    clearError: () => setError(null),
  };
}

export default usePostMutations;
