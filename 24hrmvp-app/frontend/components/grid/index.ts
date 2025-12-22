// ============================================
// THE GRID - COMPONENTS INDEX
// File: frontend/components/grid/index.ts
// FIXED: Updated type imports to match available exports
// ============================================

// Social Components
export { SocialWall } from './SocialWall';

// Forum Components
export { ForumPostCard } from './ForumPostCard';
export { ThreadedDiscussion } from './ThreadedDiscussion';

// Re-export types for convenience
export type {
  // Social types
  SocialPost,
  SocialPlatform,
  SocialFeedResponse,
  // Forum types
  ForumPost,
  ForumFeedResponse,
  ForumThreadResponse,
  ForumComment,
  PostType,
  SortType,
  TimeframeType,
  CreatePostData,
  UpdatePostData,
  // Leaderboard types
  LeaderboardEntry,
  LeaderboardResponse,
  // Stream types
  StreamStatus,
  Livestream,
} from '../../lib/types/grid';
