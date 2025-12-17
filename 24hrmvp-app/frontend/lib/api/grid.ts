// ============================================
// 24HRMVP - GRID API CLIENT
// File: frontend/lib/api/grid.ts
// Grid endpoints - LIVE DATA (Phase 1B)
// ============================================

import { get, post, put, del } from './client';
import type {
  ForumPost,
  ForumFeedResponse,
  ForumThreadResponse,
  SocialFeedResponse,
  SocialPost,
  LeaderboardResponse,
} from '../types/grid';

// Export types with index signatures
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

// ============================================
// FORUM API
// ============================================

export interface ForumFeedParams {
  sort?: 'hot' | 'new' | 'top' | 'controversial';
  type?: string;
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
  page?: number;
  limit?: number;
  tags?: string[];
}

/**
 * Get forum feed
 */
export async function getForumFeed(params: ForumFeedParams = {}): Promise<ForumFeedResponse> {
  const query = new URLSearchParams();
  if (params.sort) query.set('sort', params.sort);
  if (params.type) query.set('type', params.type);
  if (params.timeframe) query.set('timeframe', params.timeframe);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.tags?.length) query.set('tags', params.tags.join(','));
  const queryString = query.toString();
  return get(`/api/grid/forum${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get single forum post by slug
 */
export async function getForumPost(slug: string): Promise<{ success: boolean; post: ForumPost }> {
  return get(`/api/grid/forum/post/${slug}`);
}

/**
 * Get forum thread (post with replies)
 */
export async function getForumThread(
  slug: string,
  params: { page?: number; limit?: number } = {}
): Promise<ForumThreadResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  const queryString = query.toString();
  return get(`/api/grid/forum/thread/${slug}${queryString ? `?${queryString}` : ''}`);
}

/**
 * Create new forum post
 */
export async function createForumPost(data: CreatePostData): Promise<{ success: boolean; post: ForumPost }> {
  return post('/api/grid/forum', data);
}

/**
 * Update forum post
 */
export async function updateForumPost(
  slug: string,
  data: UpdatePostData
): Promise<{ success: boolean; post: ForumPost }> {
  return put(`/api/grid/forum/post/${slug}`, data);
}

/**
 * Delete forum post
 */
export async function deleteForumPost(slug: string): Promise<{ success: boolean }> {
  return del(`/api/grid/forum/post/${slug}`);
}

/**
 * Vote on a forum post
 */
export async function voteOnPost(
  postId: string,
  value: 1 | -1
): Promise<{ success: boolean; score: number; userVote: number }> {
  return post(`/api/grid/forum/post/${postId}/vote`, { value });
}

/**
 * Remove vote from post
 */
export async function removeVote(postId: string): Promise<{ success: boolean; score: number }> {
  return del(`/api/grid/forum/post/${postId}/vote`);
}

/**
 * Bookmark a post
 */
export async function bookmarkPost(postId: string): Promise<{ success: boolean }> {
  return post(`/api/grid/forum/post/${postId}/bookmark`, {});
}

/**
 * Remove bookmark
 */
export async function removeBookmark(postId: string): Promise<{ success: boolean }> {
  return del(`/api/grid/forum/post/${postId}/bookmark`);
}

/**
 * Get user bookmarks
 */
export async function getUserBookmarks(
  params: { page?: number; limit?: number } = {}
): Promise<ForumFeedResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  const queryString = query.toString();
  return get(`/api/grid/forum/bookmarks${queryString ? `?${queryString}` : ''}`, true);
}

// ============================================
// SOCIAL API
// ============================================

export interface SocialFeedParams {
  platform?: 'FARCASTER' | 'TWITTER' | 'INSTAGRAM' | 'TIKTOK' | 'all';
  channelId?: string;
  authorFid?: number;
  hashtag?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Get social feed
 */
export async function getSocialFeed(params: SocialFeedParams = {}): Promise<SocialFeedResponse> {
  const query = new URLSearchParams();
  if (params.platform) query.set('platform', params.platform);
  if (params.channelId) query.set('channelId', params.channelId);
  if (params.authorFid) query.set('authorFid', params.authorFid.toString());
  if (params.hashtag) query.set('hashtag', params.hashtag);
  if (params.featured) query.set('featured', 'true');
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  const queryString = query.toString();
  return get(`/api/grid/social${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get trending social posts
 */
export async function getTrendingSocial(
  channelId?: string,
  limit?: number
): Promise<{ success: boolean; posts: SocialPost[] }> {
  const query = new URLSearchParams();
  if (channelId) query.set('channelId', channelId);
  if (limit) query.set('limit', limit.toString());
  const queryString = query.toString();
  return get(`/api/grid/social/trending${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get posts by hashtag
 */
export async function getPostsByHashtag(
  tag: string,
  limit?: number
): Promise<{ success: boolean; posts: SocialPost[]; hashtag: string }> {
  const query = limit ? `?limit=${limit}` : '';
  return get(`/api/grid/social/hashtag/${encodeURIComponent(tag)}${query}`);
}

/**
 * Get Farcaster channel feed (live from Neynar)
 */
export async function getFarcasterChannelFeed(
  channelId: string,
  cursor?: string,
  limit?: number
): Promise<{ success: boolean; casts: any[]; next?: { cursor: string } }> {
  const query = new URLSearchParams();
  if (cursor) query.set('cursor', cursor);
  if (limit) query.set('limit', limit.toString());
  const queryString = query.toString();
  return get(`/api/grid/social/farcaster/channel/${channelId}/feed${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get trending Farcaster channels
 */
export async function getTrendingChannels(
  limit?: number
): Promise<{ success: boolean; channels: Array<{ id: string; name: string; follower_count: number }> }> {
  const query = limit ? `?limit=${limit}` : '';
  return get(`/api/grid/social/farcaster/channels${query}`);
}

// ============================================
// LEADERBOARD API
// ============================================

export interface LeaderboardParams {
  metric?: 'points' | 'submissions' | 'votes' | 'forum_score' | 'achievements';
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(params: LeaderboardParams = {}): Promise<LeaderboardResponse> {
  const query = new URLSearchParams();
  if (params.metric) query.set('metric', params.metric);
  if (params.timeframe) query.set('timeframe', params.timeframe);
  if (params.limit) query.set('limit', params.limit.toString());
  const queryString = query.toString();
  return get(`/api/leaderboard${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get current user's ranks
 */
export async function getMyRanks(): Promise<{
  success: boolean;
  userId: string;
  ranks: Record<string, number>;
}> {
  return get('/api/leaderboard/me', true);
}

/**
 * Get available metrics
 */
export async function getLeaderboardMetrics(): Promise<{
  success: boolean;
  metrics: Array<{ id: string; name: string; description: string }>;
  timeframes: Array<{ id: string; name: string }>;
}> {
  return get('/api/leaderboard/metrics');
}

// ============================================
// MODERATION API
// ============================================

/**
 * Report content
 */
export async function reportContent(
  entityType: 'FORUM_POST' | 'SOCIAL_POST' | 'COMMENT' | 'USER',
  entityId: string,
  reason: string
): Promise<{ success: boolean }> {
  return post('/api/grid/moderation/report', { entityType, entityId, reason });
}

/**
 * Check content before posting (preview)
 */
export async function checkContent(
  content: string
): Promise<{ success: boolean; flagged: boolean; categories: string[] }> {
  return post('/api/grid/moderation/check', { content });
}

// ============================================
// GRID HEALTH
// ============================================

/**
 * Check Grid API health
 */
export async function getGridHealth(): Promise<{
  success: boolean;
  status: string;
  components: Record<string, string>;
}> {
  return get('/api/grid/health');
}
