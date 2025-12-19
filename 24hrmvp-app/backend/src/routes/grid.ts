// ============================================
// 24HRMVP - THE GRID MAIN ROUTER (PRODUCTION READY)
// File: backend/src/routes/grid.ts
// Aggregates all Grid sub-routes + Stats endpoint
// 
// UPDATED: Added chat routes under /api/grid/chat
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import forumRoutes from './forum';
import moderationRoutes from './moderation';
import socialRoutes from './social';
import chatRoutes from './chat.routes';
import { chatLimiter } from '../middleware/rateLimiter';

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

// Chat routes: /api/grid/chat/* (with rate limiting)
router.use('/chat', chatLimiter, chatRoutes);

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
    version: '1.1.0',
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
      chat: {
        base: '/api/grid/chat',
        routes: [
          'GET /rooms - List all public rooms',
          'GET /rooms/my - Get user rooms (auth required)',
          'POST /rooms - Create room (auth required)',
          'GET /rooms/:slug - Get room by slug',
          'PATCH /rooms/:roomId - Update room (auth required)',
          'DELETE /rooms/:roomId - Delete room (auth required)',
          'POST /rooms/:roomId/join - Join room (auth required)',
          'POST /rooms/:roomId/leave - Leave room (auth required)',
          'GET /rooms/:roomId/messages - Get messages',
          'POST /rooms/:roomId/messages - Send message (auth required)',
          'GET /rooms/:roomId/participants - Get participants',
          'PATCH /messages/:messageId - Edit message (auth required)',
          'DELETE /messages/:messageId - Delete message (auth required)',
          'POST /messages/:messageId/pin - Pin message (auth required)',
          'POST /rooms/:roomId/read - Mark as read (auth required)',
          'GET /unread - Get unread counts (auth required)',
        ],
      },
      social: {
        base: '/api/grid/social',
        routes: [
          'GET / - Social feed',
          'GET /trending - Trending posts',
          'GET /hashtag/:tag - Posts by hashtag',
          'GET /farcaster/channel/:channelId/feed - Farcaster channel feed',
        ],
      },
      moderation: {
        base: '/api/grid/moderation',
        routes: [
          'POST /report - Report content',
          'POST /check - Check content',
          'GET /queue - Get moderation queue (admin)',
        ],
      },
    },
  });
});

/**
 * GET /api/grid/stats
 * Get grid statistics
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    // Parallel queries for efficiency
    const [
      forumPostCount,
      socialPostCount,
      activeUserCount,
      chatRoomCount,
      chatMessageCount,
    ] = await Promise.all([
      prisma.forumPost.count({
        where: { moderationStatus: 'APPROVED' },
      }),
      prisma.socialPost.count({
        where: { isHidden: false },
      }),
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Active in last 24h
          },
        },
      }),
      prisma.chatRoom.count({
        where: { isActive: true },
      }),
      prisma.chatMessage.count({
        where: { isDeleted: false },
      }),
    ]);

    // Get trending tags from recent forum posts
    const recentPosts = await prisma.forumPost.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        moderationStatus: 'APPROVED',
      },
      select: { tags: true },
      take: 100,
    });

    const tagCounts = new Map<string, number>();
    recentPosts.forEach((post) => {
      post.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const trendingTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      success: true,
      stats: {
        forum: {
          totalPosts: forumPostCount,
          trendingTags,
        },
        social: {
          totalPosts: socialPostCount,
        },
        chat: {
          totalRooms: chatRoomCount,
          totalMessages: chatMessageCount,
        },
        community: {
          activeUsers24h: activeUserCount,
        },
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching grid stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch grid statistics',
    });
  }
});

/**
 * GET /api/grid/health
 * Grid-specific health check
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      status: 'healthy',
      components: {
        database: 'connected',
        forum: 'operational',
        social: 'operational',
        chat: 'operational',
        moderation: 'operational',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
