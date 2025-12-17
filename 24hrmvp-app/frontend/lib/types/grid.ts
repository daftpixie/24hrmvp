// ============================================
// 24HRMVP - FRONTEND GRID TYPES
// File: frontend/lib/types/grid.ts
// Client-side types matching backend API
// ============================================

// ============================================
// FORUM TYPES
// ============================================

export interface ForumPost {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  type: string;
  author: {
    id: string;
    fid: number;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  score: number;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  viewCount: number;
  wilsonScore: number;
  hotScore: number;
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  userVote?: number | null;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    replies: number;
    votes: number;
    bookmarks: number;
  };
}

export interface ForumComment {
  id: string;
  content: string;
  author: {
    id: string;
    fid: number;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  score: number;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  userVote?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForumFeedParams {
  sort?: SortType;
  type?: string;
  timeframe?: TimeframeType;
  page?: number;
  limit?: number;
}

export interface ForumFeedResponse {
  success: boolean;
  posts: ForumPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface ForumThreadResponse {
  success: boolean;
  post: ForumPost;
  replies: ForumPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================
// SOCIAL TYPES
// ============================================

export type SocialPlatform = 'FARCASTER' | 'TWITTER' | 'INSTAGRAM' | 'TIKTOK';

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  externalId: string;
  author: {
    fid: number | null;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  mentions: string[];
  engagement: {
    likes: number;
    reposts: number;
    replies: number;
    impressions: number;
  };
  channelId: string | null;
  externalUrl: string | null;
  isFeatured: boolean;
  publishedAt: string;
}

export interface SocialFeedResponse {
  success: boolean;
  posts: SocialPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================
// LEADERBOARD TYPES
// ============================================

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    fid: number;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  score: number;
  metric: string;
}

export interface LeaderboardResponse {
  success: boolean;
  metric: string;
  timeframe: string;
  entries: LeaderboardEntry[];
  userRank?: LeaderboardEntry | null;
}

// ============================================
// MUTATION TYPES
// ============================================

export interface CreatePostData {
  title?: string;
  content: string;
  type?: string;
  parentId?: string;
  ideaId?: string;
  tags?: string[];
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isLocked?: boolean;
}

// ============================================
// SORT & FILTER TYPES
// ============================================

export type SortType = 'hot' | 'new' | 'top' | 'controversial';
export type TimeframeType = 'day' | 'week' | 'month' | 'year' | 'all';
export type PostType = 'DISCUSSION' | 'QUESTION' | 'SHOWCASE' | 'FEEDBACK' | 'ANNOUNCEMENT';

// ============================================
// LIVESTREAM TYPES
// ============================================

export type StreamStatus = 
  | 'DRAFT' 
  | 'SCHEDULED' 
  | 'STARTING' 
  | 'LIVE' 
  | 'ENDING' 
  | 'ENDED' 
  | 'CANCELLED' 
  | 'ERROR';

export interface Livestream {
  id: string;
  title: string;
  description: string | null;
  status: StreamStatus;
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  hostId: string;
  host: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  viewerCount: number;
  peakViewers: number;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  tags: string[];
  category: string | null;
  chatRoomId: string | null;
  createdAt: string;
}

// ============================================
// CHANNEL TYPES
// ============================================

export interface FarcasterChannel {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  followerCount: number;
  url?: string;
}
