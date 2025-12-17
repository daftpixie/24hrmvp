// ============================================
// THE GRID - COMPONENTS INDEX
// File: frontend/components/grid/index.ts
// Export all Grid components
// ============================================

// Social Components
export { SocialWall } from './SocialWall';

// Forum Components
export { ForumPostCard } from './ForumPostCard';
export { ThreadedDiscussion } from './ThreadedDiscussion';

// Re-export types for convenience
export type {
  SocialPost,
  SocialPlatform,
  ForumPost,
  ForumFeedResponse,
  ForumThreadResponse,
  PostType,
  SortType,
  TimeframeType,
  CreatePostData,
  UpdatePostData,
  LeaderboardEntry,
  LeaderboardResponse,
  SocialFeedResponse,
} from '../../lib/types/grid';