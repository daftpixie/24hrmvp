// ============================================
// 24HRMVP - GRID API CLIENT (PRODUCTION READY)
// File: frontend/lib/api/grid.ts
// FIXED: Added value/score field in LeaderboardEntry
// FIXED: Added missing exports (getLeaderboard, getTrendingChannels)
// FIXED: Updated ApiResponse to include pagination
// ============================================

import { getApiUrl } from '../config';

// ============================================
// TYPES
// ============================================

export interface CreatePostData {
  title?: string; // Optional for replies
  content: string;
  type?: 'DISCUSSION' | 'QUESTION' | 'ANNOUNCEMENT' | 'SHOWCASE' | 'TUTORIAL' | 'POLL' | 'FEEDBACK';
  tags?: string[];
  parentId?: string; // For replies
  ideaId?: string; // For idea-linked posts
}

export interface ForumPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  type: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  upvotes: number;
  downvotes: number;
  score: number;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isBookmarked?: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userVote?: number;
  _count?: {
    replies?: number;
  };
}

export interface PaginationInfo {
  page: number;
  pages: number;
  total: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  post?: T extends any[] ? never : T;
  posts?: T extends any[] ? T : T[];
  entries?: LeaderboardEntry[];
  channels?: TrendingChannel[];
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  memberCount: number;
  messageCount: number;
  createdAt: string;
  iconUrl?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  createdAt: string;
  isEdited?: boolean;
  isPinned?: boolean;
  replyTo?: {
    id: string;
    content: string;
    author: { username: string };
  };
}

// ============================================
// LEADERBOARD TYPES
// ============================================

export type LeaderboardMetric = 'points' | 'submissions' | 'votes' | 'forum_score' | 'achievements';
export type LeaderboardTimeframe = 'day' | 'week' | 'month' | 'year' | 'all';

export interface LeaderboardParams {
  metric?: LeaderboardMetric;
  timeframe?: LeaderboardTimeframe;
  limit?: number;
  offset?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    fid: number;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  value: number; // The metric value
  score: number; // Alias for value (backward compatibility)
  metric: string;
  change?: number; // Rank change from previous period
}

export interface LeaderboardResponse {
  success: boolean;
  entries: LeaderboardEntry[];
  metric: string;
  timeframe: string;
  total: number;
  updatedAt: string;
}

// ============================================
// TRENDING CHANNELS TYPES
// ============================================

export interface TrendingChannel {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  image_url?: string;
  followerCount?: number;
  follower_count?: number;
  url?: string;
  postCount?: number;
}

export interface TrendingChannelsResponse {
  success: boolean;
  channels: TrendingChannel[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get authentication headers from session storage
 */
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

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: 'include',
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }
  
  return data;
}

// ============================================
// LEADERBOARD API
// ============================================

/**
 * Get leaderboard data
 */
export async function getLeaderboard(params: LeaderboardParams = {}): Promise<LeaderboardResponse> {
  const searchParams = new URLSearchParams();
  if (params.metric) searchParams.set('metric', params.metric);
  if (params.timeframe) searchParams.set('timeframe', params.timeframe);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  
  const query = searchParams.toString();
  const response = await apiRequest<LeaderboardResponse>(`/api/grid/leaderboard${query ? `?${query}` : ''}`);
  
  // Normalize entries to have both value and score
  if (response.entries) {
    response.entries = response.entries.map(entry => ({
      ...entry,
      score: entry.score ?? entry.value,
      value: entry.value ?? entry.score,
    }));
  }
  
  return response;
}

// ============================================
// TRENDING CHANNELS API
// ============================================

/**
 * Get trending Farcaster channels
 */
export async function getTrendingChannels(limit: number = 20): Promise<TrendingChannelsResponse> {
  return apiRequest(`/api/grid/social/channels/trending?limit=${limit}`);
}

// ============================================
// FORUM API
// ============================================

export interface ForumFeedParams {
  sort?: 'hot' | 'new' | 'top';
  type?: string;
  filter?: 'all' | 'questions' | 'discussions' | 'announcements' | 'showcases';
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all';
  cursor?: string;
  page?: number;
  limit?: number;
  tags?: string[];
}

export interface ForumFeedResponse {
  success: boolean;
  posts: ForumPost[];
  pagination?: PaginationInfo;
}

/**
 * Get forum feed with pagination and filtering
 */
export async function getForumFeed(params: ForumFeedParams = {}): Promise<ForumFeedResponse> {
  const searchParams = new URLSearchParams();
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.type) searchParams.set('type', params.type);
  if (params.filter) searchParams.set('filter', params.filter);
  if (params.timeframe) searchParams.set('timeframe', params.timeframe);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.tags && params.tags.length > 0) {
    searchParams.set('tags', params.tags.join(','));
  }
  
  const query = searchParams.toString();
  return apiRequest(`/api/grid/forum${query ? `?${query}` : ''}`);
}

/**
 * Get a single forum post by slug
 */
export async function getForumPost(slug: string): Promise<ApiResponse<ForumPost>> {
  return apiRequest(`/api/grid/forum/post/${slug}`);
}

/**
 * Get forum thread (post with replies)
 */
export async function getForumThread(slug: string): Promise<ApiResponse<ForumPost>> {
  return apiRequest(`/api/grid/forum/thread/${slug}`);
}

/**
 * Create a new forum post
 */
export async function createForumPost(data: CreatePostData): Promise<ApiResponse<ForumPost>> {
  return apiRequest('/api/grid/forum', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a forum post
 */
export async function updateForumPost(
  slug: string,
  data: Partial<CreatePostData>
): Promise<ApiResponse<ForumPost>> {
  return apiRequest(`/api/grid/forum/post/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a forum post
 */
export async function deleteForumPost(slug: string): Promise<ApiResponse<null>> {
  return apiRequest(`/api/grid/forum/post/${slug}`, {
    method: 'DELETE',
  });
}

/**
 * Vote on a forum post
 */
export async function voteOnForumPost(
  postId: string,
  value: 1 | -1
): Promise<ApiResponse<{ upvotes: number; downvotes: number; score: number; userVote: number }>> {
  return apiRequest(`/api/grid/forum/post/${postId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  });
}

/**
 * Remove vote from a forum post
 */
export async function removeForumVote(postId: string): Promise<ApiResponse<null>> {
  return apiRequest(`/api/grid/forum/post/${postId}/vote`, {
    method: 'DELETE',
  });
}

/**
 * Bookmark a forum post (toggle)
 */
export async function bookmarkForumPost(postId: string): Promise<ApiResponse<{ isBookmarked: boolean }>> {
  return apiRequest(`/api/grid/forum/post/${postId}/bookmark`, {
    method: 'POST',
  });
}

/**
 * Remove bookmark from a forum post
 */
export async function removeForumBookmark(postId: string): Promise<ApiResponse<null>> {
  return apiRequest(`/api/grid/forum/post/${postId}/bookmark`, {
    method: 'DELETE',
  });
}

/**
 * Get user's bookmarked posts
 */
export async function getUserBookmarks(): Promise<ApiResponse<ForumPost[]>> {
  return apiRequest('/api/grid/forum/bookmarks');
}

// ============================================
// CHAT API
// ============================================

/**
 * List all chat rooms
 */
export async function getChatRooms(params: {
  type?: string;
  limit?: number;
  cursor?: string;
} = {}): Promise<ApiResponse<ChatRoom[]> & { rooms: ChatRoom[] }> {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.cursor) searchParams.set('cursor', params.cursor);
  
  const query = searchParams.toString();
  return apiRequest(`/api/grid/chat/rooms${query ? `?${query}` : ''}`);
}

/**
 * Get a chat room by slug
 */
export async function getChatRoom(slug: string): Promise<ApiResponse<ChatRoom> & { room: ChatRoom }> {
  return apiRequest(`/api/grid/chat/rooms/${slug}`);
}

/**
 * Get user's joined rooms
 */
export async function getUserChatRooms(): Promise<ApiResponse<ChatRoom[]> & { rooms: ChatRoom[] }> {
  return apiRequest('/api/grid/chat/rooms/my');
}

/**
 * Create a new chat room
 */
export async function createChatRoom(data: {
  name: string;
  description?: string;
  type?: 'PUBLIC' | 'PRIVATE' | 'DIRECT' | 'IDEA';
}): Promise<ApiResponse<ChatRoom> & { room: ChatRoom }> {
  return apiRequest('/api/grid/chat/rooms', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Join a chat room
 */
export async function joinChatRoom(roomId: string): Promise<ApiResponse<null>> {
  return apiRequest(`/api/grid/chat/rooms/${roomId}/join`, {
    method: 'POST',
  });
}

/**
 * Leave a chat room
 */
export async function leaveChatRoom(roomId: string): Promise<ApiResponse<null>> {
  return apiRequest(`/api/grid/chat/rooms/${roomId}/leave`, {
    method: 'POST',
  });
}

/**
 * Get chat messages
 */
export async function getChatMessages(
  roomId: string,
  params: { limit?: number; cursor?: string } = {}
): Promise<ApiResponse<ChatMessage[]> & { messages: ChatMessage[] }> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.cursor) searchParams.set('cursor', params.cursor);
  
  const query = searchParams.toString();
  return apiRequest(`/api/grid/chat/rooms/${roomId}/messages${query ? `?${query}` : ''}`);
}

/**
 * Send a chat message
 */
export async function sendChatMessage(
  roomId: string,
  data: { content: string; replyToId?: string }
): Promise<ApiResponse<ChatMessage> & { message: ChatMessage }> {
  return apiRequest(`/api/grid/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Edit a chat message
 */
export async function editChatMessage(
  messageId: string,
  content: string
): Promise<ApiResponse<ChatMessage>> {
  return apiRequest(`/api/grid/chat/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

/**
 * Delete a chat message
 */
export async function deleteChatMessage(messageId: string): Promise<ApiResponse<null>> {
  return apiRequest(`/api/grid/chat/messages/${messageId}`, {
    method: 'DELETE',
  });
}

/**
 * Mark room as read
 */
export async function markChatRoomAsRead(roomId: string): Promise<ApiResponse<null>> {
  return apiRequest(`/api/grid/chat/rooms/${roomId}/read`, {
    method: 'POST',
  });
}

/**
 * Get unread message counts
 */
export async function getUnreadCounts(): Promise<ApiResponse<Record<string, number>>> {
  return apiRequest('/api/grid/chat/unread');
}

// ============================================
// GRID STATS API
// ============================================

/**
 * Get grid statistics
 */
export async function getGridStats(): Promise<ApiResponse<{
  forum: { totalPosts: number; trendingTags: { tag: string; count: number }[] };
  social: { totalPosts: number };
  chat: { totalRooms: number; totalMessages: number };
  community: { activeUsers24h: number };
  updatedAt: string;
}>> {
  return apiRequest('/api/grid/stats');
}

/**
 * Check grid health
 */
export async function checkGridHealth(): Promise<ApiResponse<{
  status: string;
  components: Record<string, string>;
  timestamp: string;
}>> {
  return apiRequest('/api/grid/health');
}

export default {
  // Leaderboard
  getLeaderboard,
  // Trending Channels
  getTrendingChannels,
  // Forum
  getForumFeed,
  getForumPost,
  getForumThread,
  createForumPost,
  updateForumPost,
  deleteForumPost,
  voteOnForumPost,
  removeForumVote,
  bookmarkForumPost,
  removeForumBookmark,
  getUserBookmarks,
  // Chat
  getChatRooms,
  getChatRoom,
  getUserChatRooms,
  createChatRoom,
  joinChatRoom,
  leaveChatRoom,
  getChatMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  markChatRoomAsRead,
  getUnreadCounts,
  // Stats
  getGridStats,
  checkGridHealth,
};
