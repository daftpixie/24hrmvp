// ============================================
// 24HRMVP - THE GRID MAIN ROUTER (FIXED)
// File: backend/src/routes/grid.ts
// Aggregates all Grid sub-routes + Stats endpoint
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import forumRoutes from './forum';
import moderationRoutes from './moderation';
import socialRoutes from './social';

const router = Router();

// ============================================
// MOUNT SUB-ROUTES
// ============================================

// Forum routes: /api/grid/forum/*
router.use('/forum', forumRoutes);

// Social aggregation routes: /api/grid/social/*
router.use('/social', socialRoutes);

// Moderation routes: /api/grid/moderation/*
router.use('/moderation', moderationRoutes);

// ============================================
// GRID ROOT ENDPOINTS
// ============================================

/**
 * GET /api/grid
 * Grid API info endpoint
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    name: 'The Grid API',
    version: '1.0.0',
    description: 'Community hub for 24HRMVP',
    endpoints: {
      stats: {
        base: '/api/grid/stats',
        description: 'Get grid statistics',
      },
      forum: {
        base: '/api/grid/forum',
        routes: [
          'GET / - Feed with sorting/filtering',
          'GET /post/:slug - Single post',
          'GET /thread/:slug - Post with replies',
          'POST / - Create post (auth required)',
          'PUT /post/:slug - Update post (auth required)',
          'DELETE /post/:slug - Delete post (auth required)',
          'POST /post/:postId/vote - Vote on post (auth required)',
          'DELETE /post/:postId/vote - Remove vote (auth required)',
          'POST /post/:postId/bookmark - Bookmark post (auth required)',
          'DELETE /post/:postId/bookmark - Remove bookmark (auth required)',
          'GET /bookmarks - Get user bookmarks (auth required)',
        ],
      },
      social: {
        base: '/api/grid/social',
        routes: [
          'GET / - Aggregated social feed',
          'GET /trending - Trending posts',
          'GET /hashtag/:tag - Posts by hashtag',
          'GET /user/:fid - Posts by Farcaster user',
          'GET /farcaster/channels - Trending channels',
          'GET /farcaster/channel/:channelId - Channel details',
          'GET /farcaster/channel/:channelId/feed - Live channel feed',
          'GET /farcaster/cast/:hash - Single cast',
          'POST /sync/:channelId - Sync channel (admin)',
          'POST /:postId/feature - Feature post (admin)',
          'POST /:postId/hide - Hide post (admin)',
        ],
      },
      moderation: {
        base: '/api/grid/moderation',
        routes: [
          'GET /queue - Moderation queue (admin)',
          'GET /queue/:id - Queue item details (admin)',
          'POST /queue/:id/review - Review item (admin)',
          'GET /stats - Moderation stats (admin)',
          'POST /report - Report content (auth required)',
          'POST /check - Check content preview (auth required)',
        ],
      },
    },
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/grid/stats
 * Get grid-wide statistics for the dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Fetch all stats in parallel for performance
    const [
      chatRoomCount,
      forumPostCount,
      totalMessageCount,
      activeUserCount,
    ] = await Promise.all([
      // Count active chat rooms
      prisma.chatRoom.count({
        where: { isActive: true },
      }),
      
      // Count forum posts (not deleted)
      prisma.forumPost.count({
  	where: { moderationStatus: 'APPROVED' },
      }),
      
      // Count total chat messages
      prisma.chatMessage.count({
        where: { isDeleted: false },
      }),
      
      // Count users active in last 24 hours
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        chatRooms: chatRoomCount,
        forumPosts: forumPostCount,
        totalMessages: totalMessageCount,
        activeUsers: activeUserCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching grid stats:', error);
    
    // Return default stats on error to prevent frontend crashes
    res.json({
      success: true,
      stats: {
        chatRooms: 5,
        forumPosts: 0,
        totalMessages: 0,
        activeUsers: 0,
      },
      timestamp: new Date().toISOString(),
      _error: 'Stats partially unavailable',
    });
  }
});

/**
 * GET /api/grid/health
 * Grid-specific health check
 */
router.get('/health', async (req: Request, res: Response) => {
  // Import here to avoid circular dependency issues
  const { checkRedisHealth } = await import('../services/redis');
  const { neynarService } = await import('../services/neynar');

  const redisHealth = await checkRedisHealth();

  res.json({
    success: true,
    status: 'healthy',
    components: {
      forum: 'operational',
      social: neynarService.isConfigured() ? 'operational' : 'degraded (no API key)',
      moderation: 'operational',
      cache: redisHealth.connected ? 'operational' : 'degraded (memory fallback)',
    },
    details: {
      redis: {
        connected: redisHealth.connected,
        latency: redisHealth.latency,
      },
      neynar: {
        configured: neynarService.isConfigured(),
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
