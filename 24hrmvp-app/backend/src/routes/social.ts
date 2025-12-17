// ============================================
// 24HRMVP - THE GRID SOCIAL ROUTES
// File: backend/src/routes/social.ts
// Social feed aggregation API endpoints
// 
// FIXED: Import requireAdmin (now exported from gridAuth)
// FIXED: Add explicit Request/Response types
// ============================================

import { Router, Request, Response } from 'express';
import { SocialPlatform } from '@prisma/client';
import { socialAggregationService } from '../services/socialAggregation';
import { neynarService } from '../services/neynar';
import { 
  requireAuth, 
  requireAdmin,
  optionalAuth,
} from '../middleware/gridAuth';
import { SocialFeedParams } from '../types/grid';

const router = Router();

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * GET /api/grid/social
 * Get aggregated social feed
 */
router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const params: SocialFeedParams = {
      platform: (req.query.platform as SocialPlatform | 'all') || 'all',
      channelId: req.query.channelId as string | undefined,
      authorFid: req.query.authorFid ? parseInt(req.query.authorFid as string) : undefined,
      hashtag: req.query.hashtag as string | undefined,
      featured: req.query.featured === 'true',
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 50),
    };

    const feed = await socialAggregationService.getFeed(params);

    res.json({
      success: true,
      ...feed,
    });
  } catch (error) {
    console.error('Error fetching social feed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch social feed',
    });
  }
});

/**
 * GET /api/grid/social/trending
 * Get trending posts
 */
router.get('/trending', async (req: Request, res: Response): Promise<void> => {
  try {
    const channelId = req.query.channelId as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 25);

    const posts = await socialAggregationService.getTrending(channelId, limit);

    res.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error('Error fetching trending:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch trending posts',
    });
  }
});

/**
 * GET /api/grid/social/hashtag/:tag
 * Get posts by hashtag
 */
router.get('/hashtag/:tag', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tag } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const posts = await socialAggregationService.getByHashtag(tag, limit);

    res.json({
      success: true,
      posts,
      hashtag: tag.toLowerCase().replace(/^#/, ''),
    });
  } catch (error) {
    console.error('Error fetching by hashtag:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch posts by hashtag',
    });
  }
});

/**
 * GET /api/grid/social/user/:fid
 * Get posts by Farcaster user
 */
router.get('/user/:fid', async (req: Request, res: Response): Promise<void> => {
  try {
    const fid = parseInt(req.params.fid);
    
    if (isNaN(fid)) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid FID',
      });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const posts = await socialAggregationService.getByAuthor(fid, limit);

    res.json({
      success: true,
      posts,
      fid,
    });
  } catch (error) {
    console.error('Error fetching by user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch user posts',
    });
  }
});

// ============================================
// FARCASTER-SPECIFIC ENDPOINTS
// ============================================

/**
 * GET /api/grid/social/farcaster/channels
 * Get trending Farcaster channels
 */
router.get('/farcaster/channels', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!neynarService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Farcaster integration not configured',
      });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 25);
    const channels = await neynarService.getTrendingChannels(limit);

    res.json({
      success: true,
      channels,
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch channels',
    });
  }
});

/**
 * GET /api/grid/social/farcaster/channel/:channelId
 * Get channel details
 */
router.get('/farcaster/channel/:channelId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!neynarService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Farcaster integration not configured',
      });
      return;
    }

    const { channelId } = req.params;
    const channel = await neynarService.getChannel(channelId);

    if (!channel) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Channel not found',
      });
      return;
    }

    res.json({
      success: true,
      channel,
    });
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch channel',
    });
  }
});

/**
 * GET /api/grid/social/farcaster/channel/:channelId/feed
 * Get live feed from a Farcaster channel (direct from Neynar)
 */
router.get('/farcaster/channel/:channelId/feed', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!neynarService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Farcaster integration not configured',
      });
      return;
    }

    const { channelId } = req.params;
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 50);

    const feed = await neynarService.getChannelFeed(channelId, cursor, limit);

    res.json({
      success: true,
      casts: feed.casts,
      next: feed.next,
    });
  } catch (error) {
    console.error('Error fetching channel feed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch channel feed',
    });
  }
});

/**
 * GET /api/grid/social/farcaster/cast/:hash
 * Get a specific cast by hash
 */
router.get('/farcaster/cast/:hash', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!neynarService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Farcaster integration not configured',
      });
      return;
    }

    const { hash } = req.params;
    const cast = await neynarService.getCast(hash);

    if (!cast) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Cast not found',
      });
      return;
    }

    res.json({
      success: true,
      cast,
    });
  } catch (error) {
    console.error('Error fetching cast:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch cast',
    });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * POST /api/grid/social/sync/:channelId
 * Sync a Farcaster channel to database (admin only)
 */
router.post(
  '/sync/:channelId',
  ...requireAdmin(async (req: Request, res: Response): Promise<void> => {
    try {
      if (!neynarService.isConfigured()) {
        res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          message: 'Farcaster integration not configured',
        });
        return;
      }

      const { channelId } = req.params;
      const synced = await socialAggregationService.syncFarcasterChannel(channelId);

      res.json({
        success: true,
        message: `Synced ${synced} posts from channel ${channelId}`,
        count: synced,
      });
    } catch (error) {
      console.error('Error syncing channel:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to sync channel',
      });
    }
  })
);

/**
 * POST /api/grid/social/:postId/feature
 * Feature a social post (admin only)
 */
router.post(
  '/:postId/feature',
  ...requireAdmin(async (req: Request, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;
      await socialAggregationService.featurePost(postId);

      res.json({
        success: true,
        message: 'Post featured successfully',
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Post not found',
        });
        return;
      }

      console.error('Error featuring post:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to feature post',
      });
    }
  })
);

/**
 * POST /api/grid/social/:postId/hide
 * Hide a social post (admin only)
 */
router.post(
  '/:postId/hide',
  ...requireAdmin(async (req: Request, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;
      await socialAggregationService.hidePost(postId);

      res.json({
        success: true,
        message: 'Post hidden successfully',
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Post not found',
        });
        return;
      }

      console.error('Error hiding post:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to hide post',
      });
    }
  })
);

/**
 * POST /api/grid/social/refresh-metrics
 * Refresh engagement metrics for recent posts (admin only)
 */
router.post(
  '/refresh-metrics',
  ...requireAdmin(async (req: Request, res: Response): Promise<void> => {
    try {
      if (!neynarService.isConfigured()) {
        res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          message: 'Farcaster integration not configured',
        });
        return;
      }

      const updated = await socialAggregationService.refreshEngagementMetrics();

      res.json({
        success: true,
        message: `Refreshed metrics for ${updated} posts`,
        count: updated,
      });
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to refresh metrics',
      });
    }
  })
);

export default router;
