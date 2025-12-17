// ============================================
// 24HRMVP - THE GRID TYPE DEFINITIONS
// File: backend/src/types/grid.ts
// Complete type exports for Grid Phase 1
// 
// UPDATED: Multichain auth support (Dec 2025)
// FIXED: fid type compatibility with Express augmentation
// ============================================

import { Request } from 'express';
import {
  ForumPost,
  ForumPostVote,
  ForumBookmark,
  SocialPost,
  ModerationQueue,
  User,
  PostType,
  ModerationStatus,
  ModerationEntityType,
  SocialPlatform,
  ChainType,  // Added for multichain
} from '@prisma/client';

// ============================================
// AUTH REQUEST TYPES
// ============================================

/**
 * User data attached to authenticated requests
 * 
 * UPDATED: Added multichain fields for wallet auth
 * FIXED: fid is now optional (undefined) not nullable (null)
 *        This matches Express.Request.user augmentation
 */
export interface AuthUser {
  id: string;
  fid?: number;              // Optional - undefined for wallet-only users
  username: string;
  displayName?: string;
  pfpUrl?: string;
  email?: string;
  walletAddress?: string;
  // Multichain auth fields
  chainType?: ChainType;
  chainId?: number;
  authSource?: 'farcaster' | 'siwe' | 'siws';
  isAdmin?: boolean;
  isBanned?: boolean;
}

/**
 * Base authenticated request - user may be undefined
 * Use this for optional auth routes
 */
export interface OptionalAuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Authenticated request with guaranteed user
 * Use this with requireAuth middleware
 */
export interface AuthRequest extends Request {
  user: AuthUser;
}

/**
 * Type guard to check if request has authenticated user
 * 
 * UPDATED: No longer requires fid - wallet-only users are valid
 * Check for id and username which are always present
 */
export function isAuthenticated(req: Request): req is AuthRequest {
  return req.user !== undefined && 
         req.user !== null &&
         typeof req.user.id === 'string' && 
         typeof req.user.username === 'string';
}

/**
 * Assert request has authenticated user (throws if not)
 */
export function assertAuthenticated(req: Request): asserts req is AuthRequest {
  if (!isAuthenticated(req)) {
    throw new Error('Authentication required');
  }
}

/**
 * Check if authenticated user has Farcaster auth (has FID)
 */
export function hasFarcasterAuth(req: Request): boolean {
  return isAuthenticated(req) && req.user.fid !== undefined;
}

/**
 * Check if authenticated user has wallet auth
 */
export function hasWalletAuth(req: Request): boolean {
  return isAuthenticated(req) && req.user.walletAddress !== undefined;
}

/**
 * Check if user authenticated via SIWE (EVM wallet)
 */
export function isSIWEAuth(req: Request): boolean {
  return isAuthenticated(req) && req.user.authSource === 'siwe';
}

/**
 * Check if user authenticated via SIWS (Solana wallet)
 */
export function isSIWSAuth(req: Request): boolean {
  return isAuthenticated(req) && req.user.authSource === 'siws';
}

// ============================================
// FORUM TYPES
// ============================================

/**
 * Forum feed sort types
 */
export type SortType = 'hot' | 'new' | 'top' | 'controversial';

/**
 * Timeframe for filtering
 */
export type TimeframeType = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

/**
 * Parameters for forum feed queries
 */
export interface ForumFeedParams {
  sort?: SortType;
  type?: PostType;
  timeframe?: TimeframeType;
  page?: number;
  limit?: number;
  authorId?: string;
  ideaId?: string;
  parentId?: string;
  tags?: string[];
}

/**
 * DTO for creating a forum post
 */
export interface CreateForumPostDTO {
  title?: string;
  content: string;
  type?: PostType;
  parentId?: string;
  ideaId?: string;
  tags?: string[];
}

/**
 * DTO for updating a forum post
 */
export interface UpdateForumPostDTO {
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isLocked?: boolean;
}

/**
 * Forum post with author and counts
 * NOTE: author.fid uses number | null because it comes from database (Prisma)
 */
export interface ForumPostDTO extends ForumPost {
  author: {
    id: string;
    fid: number | null;       // Database field - can be null
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  _count?: {
    replies: number;
    votes: number;
    bookmarks: number;
  };
  userVote?: number | null;
  isBookmarked?: boolean;
}

/**
 * Paginated forum feed response
 */
export interface ForumFeedResponse {
  posts: ForumPostDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

/**
 * Forum thread response (post with replies)
 */
export interface ForumThreadResponse {
  post: ForumPostDTO;
  replies: ForumPostDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Forum service interface
 */
export interface IForumService {
  createPost(userId: string, data: CreateForumPostDTO): Promise<ForumPostDTO>;
  getPost(slug: string, userId?: string): Promise<ForumPostDTO | null>;
  updatePost(slug: string, userId: string, data: UpdateForumPostDTO): Promise<ForumPostDTO>;
  deletePost(slug: string, userId: string): Promise<void>;
  getFeed(params: ForumFeedParams, userId?: string): Promise<ForumFeedResponse>;
  getThread(slug: string, params: { page?: number; limit?: number }, userId?: string): Promise<ForumThreadResponse>;
  vote(postId: string, userId: string, value: 1 | -1): Promise<{ score: number; userVote: number }>;
  removeVote(postId: string, userId: string): Promise<{ score: number }>;
  bookmark(postId: string, userId: string): Promise<void>;
  removeBookmark(postId: string, userId: string): Promise<void>;
  getUserBookmarks(userId: string, params: { page?: number; limit?: number }): Promise<ForumFeedResponse>;
}

// ============================================
// SOCIAL AGGREGATION TYPES
// ============================================

/**
 * Parameters for social feed queries
 */
export interface SocialFeedParams {
  platform?: SocialPlatform | 'all';
  channelId?: string;
  authorFid?: number;
  hashtag?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Social post DTO with normalized structure
 * NOTE: author.fid uses number | null because it comes from database
 */
export interface SocialPostDTO {
  id: string;
  platform: SocialPlatform;
  externalId: string;
  author: {
    fid: number | null;       // Database field - can be null
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
  publishedAt: Date;
}

/**
 * Paginated social feed response
 */
export interface SocialFeedResponse {
  posts: SocialPostDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Social aggregation service interface
 */
export interface ISocialAggregationService {
  getFeed(params: SocialFeedParams): Promise<SocialFeedResponse>;
  getTrending(channelId?: string, limit?: number): Promise<SocialPostDTO[]>;
  syncFarcasterChannel(channelId: string): Promise<number>;
  featurePost(postId: string): Promise<void>;
  hidePost(postId: string): Promise<void>;
}

// ============================================
// NEYNAR / FARCASTER TYPES
// ============================================

/**
 * Neynar cast author structure
 */
export interface NeynarAuthor {
  fid: number | null;
  username: string;
  display_name: string | null;
  pfp_url: string | null;
  follower_count?: number;
  following_count?: number;
}

/**
 * Neynar cast structure
 */
export interface NeynarCast {
  hash: string;
  parent_hash: string | null;
  parent_url: string | null;
  root_parent_url: string | null;
  parent_author: { fid: number } | null;
  author: NeynarAuthor;
  text: string;
  timestamp: string;
  embeds: Array<{ url?: string; metadata?: any }>;
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
  replies: {
    count: number;
  };
  channel?: {
    id: string;
    name: string;
  };
  mentioned_profiles?: NeynarAuthor[];
}

/**
 * Neynar feed response structure
 */
export interface NeynarFeedResponse {
  casts: NeynarCast[];
  next?: {
    cursor: string;
  };
}

/**
 * Neynar webhook payload
 */
export interface NeynarWebhookPayload {
  created_at: number;
  type: 'cast.created' | 'reaction.created' | 'reaction.deleted';
  data: NeynarCast | { cast: NeynarCast; reaction_type: string };
}

/**
 * Neynar service interface
 */
export interface INeynarService {
  getChannelFeed(channelId: string, cursor?: string, limit?: number): Promise<NeynarFeedResponse>;
  getUserCasts(fid: number, cursor?: string, limit?: number): Promise<NeynarFeedResponse>;
  getCast(hash: string): Promise<NeynarCast | null>;
  searchCasts(query: string, limit?: number): Promise<NeynarCast[]>;
  getTrendingChannels(limit?: number): Promise<Array<{ id: string; name: string; follower_count: number }>>;
}

// ============================================
// MODERATION TYPES
// ============================================

/**
 * Moderation action types (matches Prisma ModerationStatus)
 */
export type ModerationAction = ModerationStatus;

/**
 * AI moderation result
 */
export interface AIModerationResult {
  flagged: boolean;
  score: number;
  categories: {
    hate: boolean;
    harassment: boolean;
    'self-harm': boolean;
    sexual: boolean;
    violence: boolean;
    'hate/threatening': boolean;
    'harassment/threatening': boolean;
    'self-harm/intent': boolean;
    'self-harm/instructions': boolean;
    'sexual/minors': boolean;
    'violence/graphic': boolean;
  };
  categoryScores: Record<string, number>;
}

/**
 * Moderation queue item DTO
 */
export interface ModerationQueueDTO {
  id: string;
  entityType: ModerationEntityType;
  entityId: string;
  entity?: ForumPostDTO | SocialPostDTO | { id: string; type: string };
  aiScore: number | null;
  aiCategories: AIModerationResult['categories'] | null;
  aiReason: string | null;
  action: ModerationStatus;
  reportedBy: string | null;
  reportReason: string | null;
  reportCount: number;
  reviewer?: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
  reviewNotes: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

/**
 * Moderation decision DTO
 */
export interface ModerationDecisionDTO {
  action: ModerationStatus;
  notes?: string;
}

/**
 * Overall moderation result
 */
export interface ModerationResult {
  approved: boolean;
  action: ModerationStatus;
  reason?: string;
  aiResult?: AIModerationResult;
  queueId?: string;
}

/**
 * Moderation queue query params
 */
export interface ModerationQueueParams {
  status?: ModerationStatus;
  entityType?: ModerationEntityType;
  page?: number;
  limit?: number;
}

/**
 * Moderation service interface
 */
export interface IModerationService {
  moderateContent(content: string): Promise<AIModerationResult>;
  checkAndQueue(entityType: ModerationEntityType, entityId: string, content: string): Promise<ModerationResult>;
  getQueue(params: ModerationQueueParams): Promise<{ items: ModerationQueueDTO[]; total: number }>;
  getQueueItem(id: string): Promise<ModerationQueueDTO | null>;
  review(id: string, reviewerId: string, decision: ModerationDecisionDTO): Promise<ModerationQueueDTO>;
  reportContent(entityType: ModerationEntityType, entityId: string, reporterId: string, reason: string): Promise<void>;
}

// ============================================
// RANKING TYPES
// ============================================

/**
 * Ranking metrics
 */
export interface RankingMetrics {
  wilsonScore: number;
  hotScore: number;
  controversyScore: number;
}

/**
 * Ranking service interface
 */
export interface IRankingService {
  calculateWilsonScore(upvotes: number, downvotes: number): number;
  calculateHotScore(score: number, createdAt: Date): number;
  calculateControversyScore(upvotes: number, downvotes: number): number;
  updatePostRanking(postId: string): Promise<RankingMetrics>;
  recalculateAllRankings(): Promise<number>;
}

// ============================================
// LEADERBOARD TYPES
// ============================================

/**
 * Leaderboard entry
 * NOTE: user.fid uses number | null because it comes from database
 */
export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    fid: number | null;       // Database field - can be null
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  score: number;
  metric: string;
}

/**
 * Leaderboard response
 */
export interface LeaderboardResponse {
  metric: string;
  timeframe: TimeframeType;
  entries: LeaderboardEntry[];
  userRank?: LeaderboardEntry | null;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Standard API success response
 */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiError {
  success: false;
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Union type for API responses
 */
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ============================================
// RE-EXPORT PRISMA TYPES
// ============================================

export type {
  ForumPost,
  ForumPostVote,
  ForumBookmark,
  SocialPost,
  ModerationQueue,
};

export {
  PostType,
  ModerationStatus,
  ModerationEntityType,
  SocialPlatform,
  ChainType,  // Added for multichain
};

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paginated response wrapper
 */
export interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}
