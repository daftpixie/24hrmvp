// ============================================
// 24HRMVP - GRID TYPES (COMPREHENSIVE)
// File: frontend/lib/types/grid.ts
// FIXED: SocialPost now has all required properties
// FIXED: Removed conflicting re-export from api/grid
// ============================================

// ============================================
// PAGINATION
// ============================================

export interface PaginationInfo {
  page: number;
  pages: number;
  total: number;
  limit?: number;
  hasMore?: boolean;
}

// ============================================
// API RESPONSE BASE
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

// ============================================
// STREAM STATUS (for livestreaming)
// ============================================

export type StreamStatus = 
  | 'DRAFT'
  | 'SCHEDULED'
  | 'STARTING'
  | 'LIVE'
  | 'PAUSED'
  | 'ENDED'
  | 'CANCELLED';

export const StreamStatusValues = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  STARTING: 'STARTING',
  LIVE: 'LIVE',
  PAUSED: 'PAUSED',
  ENDED: 'ENDED',
  CANCELLED: 'CANCELLED',
} as const;

// ============================================
// SOCIAL PLATFORM TYPE
// ============================================

export type SocialPlatform = 'FARCASTER' | 'TWITTER' | 'INSTAGRAM' | 'TIKTOK';

// ============================================
// SORT AND TIMEFRAME TYPES
// ============================================

export type SortType = 'hot' | 'new' | 'top' | 'controversial';
export type TimeframeType = 'day' | 'week' | 'month' | 'year' | 'all';

// ============================================
// POST TYPES
// ============================================

export type PostType = 
  | 'DISCUSSION' 
  | 'QUESTION' 
  | 'ANNOUNCEMENT' 
  | 'SHOWCASE' 
  | 'TUTORIAL' 
  | 'POLL' 
  | 'FEEDBACK';

// ============================================
// CREATE/UPDATE POST DATA
// ============================================

export interface CreatePostData {
  title?: string;
  content: string;
  type?: PostType;
  tags?: string[];
  parentId?: string;
  ideaId?: string;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  type?: PostType;
  tags?: string[];
  isPinned?: boolean;
  isLocked?: boolean;
}

// ============================================
// FORUM POST
// ============================================

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

// ============================================
// FORUM COMMENT
// ============================================

export interface ForumComment {
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

// ============================================
// FORUM FEED RESPONSE
// ============================================

export interface ForumFeedResponse {
  success: boolean;
  posts: ForumPost[];
  pagination?: PaginationInfo;
}

// ============================================
// FORUM THREAD RESPONSE
// ============================================

export interface ForumThreadResponse {
  success: boolean;
  post: ForumPost;
  comments: ForumComment[];
  pagination?: PaginationInfo;
}

// ============================================
// SOCIAL POST (COMPREHENSIVE)
// ============================================

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  externalId: string;
  // Author info
  authorFid?: number;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  // Content
  content: string;
  timestamp: string;
  // URLs
  url?: string;
  externalUrl?: string;
  // Media
  mediaUrls?: string[];
  // Channel/hashtags
  channelId?: string;
  channelName?: string;
  hashtags?: string[];
  // Engagement metrics
  likes?: number;
  reposts?: number;
  replies?: number;
  // Flags
  isFeatured: boolean;
  createdAt: string;
}

// ============================================
// SOCIAL FEED RESPONSE
// ============================================

export interface SocialFeedResponse {
  success: boolean;
  posts: SocialPost[];
  pagination?: PaginationInfo;
}

// ============================================
// CHAT TYPES
// ============================================

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
  lastMessageAt?: string;
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
  value: number;
  score: number; // Alias for value
  metric: string;
  change?: number;
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
// TRENDING CHANNEL
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
// FARCASTER CHANNEL
// ============================================

export interface FarcasterChannel {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  followerCount?: number;
  url?: string;
}

// ============================================
// GRID STATS
// ============================================

export interface GridStats {
  totalMembers: number;
  activeNow: number;
  totalMessages: number;
  todayActivity: number;
}

// ============================================
// USER PROFILE
// ============================================

export interface UserProfile {
  id: string;
  fid: number;
  username: string;
  displayName: string | null;
  pfpUrl: string | null;
  bio?: string;
  custodyAddress: string | null;
  walletAddress: string | null;
  membershipTier: string;
  points: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ACHIEVEMENT TYPES
// ============================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  type: string;
  requirement: number;
  points: number;
}

export interface UserAchievement {
  id: string;
  achievement: Achievement;
  earnedAt: string;
  progress: number;
}

// ============================================
// NOTIFICATION
// ============================================

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

// ============================================
// LIVESTREAM TYPES
// ============================================

export interface Livestream {
  id: string;
  title: string;
  description?: string;
  status: StreamStatus;
  streamKey?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  hostId: string;
  host?: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  viewerCount: number;
  startedAt?: string;
  endedAt?: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LivestreamViewer {
  id: string;
  streamId: string;
  userId?: string;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  joinedAt: string;
  leftAt?: string;
}

// ============================================
// FORUM FEED PARAMS
// ============================================

export interface ForumFeedParams {
  sort?: SortType;
  type?: string;
  filter?: 'all' | 'questions' | 'discussions' | 'announcements' | 'showcases';
  timeframe?: TimeframeType;
  cursor?: string;
  page?: number;
  limit?: number;
  tags?: string[];
}
