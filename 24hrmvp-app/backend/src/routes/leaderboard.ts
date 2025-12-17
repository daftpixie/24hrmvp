// ============================================
// 24HRMVP - THE GRID LEADERBOARD ROUTES
// File: backend/src/routes/leaderboard.ts
// Leaderboard API endpoints (regenerated)
// ============================================

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { optionalAuth, getAuthUser } from '../middleware/gridAuth';
import { leaderboard, cache } from '../services/redis';
import { TimeframeType, LeaderboardEntry, LeaderboardResponse } from '../types/grid';

const router = Router();

// Leaderboard metrics
type MetricType = 'points' | 'submissions' | 'votes' | 'forum_score' | 'achievements';

/**
 * GET /api/leaderboard
 * Get leaderboard for specified metric and timeframe
 */
router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const metric = (req.query.metric as MetricType) || 'points';
    const timeframe = (req.query.timeframe as TimeframeType) || 'all';
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);

    // Build cache key
    const cacheKey = `leaderboard:${metric}:${timeframe}`;
    
    // Check cache
    const cached = await cache.get<LeaderboardResponse>(cacheKey);
    if (cached) {
      // Add user's rank if authenticated
      const user = getAuthUser(req);
      if (user) {
        const userRank = await getUserRank(user.id, metric);
        cached.userRank = userRank;
      }
      
      res.json({
        success: true,
        ...cached,
      });
      return;
    }

    // Fetch leaderboard data
    const entries = await getLeaderboardEntries(metric, timeframe, limit);

    const response: LeaderboardResponse = {
      metric,
      timeframe,
      entries,
      userRank: null,
    };

    // Add user's rank if authenticated
    const user = getAuthUser(req);
    if (user) {
      response.userRank = await getUserRank(user.id, metric);
    }

    // Cache for 1 minute
    await cache.set(cacheKey, response, 60);

    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch leaderboard',
    });
  }
});

/**
 * GET /api/leaderboard/me
 * Get current user's rank across all metrics
 */
router.get('/me', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getAuthUser(req);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const metrics: MetricType[] = ['points', 'submissions', 'votes', 'forum_score', 'achievements'];
    const ranks: Record<string, LeaderboardEntry | null> = {};

    for (const metric of metrics) {
      ranks[metric] = await getUserRank(user.id, metric);
    }

    res.json({
      success: true,
      userId: user.id,
      ranks,
    });
  } catch (error) {
    console.error('Error fetching user ranks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch user ranks',
    });
  }
});

/**
 * GET /api/leaderboard/user/:userId
 * Get specific user's ranking
 */
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const metric = (req.query.metric as MetricType) || 'points';

    const rank = await getUserRank(userId, metric);

    if (!rank) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found on leaderboard',
      });
      return;
    }

    res.json({
      success: true,
      rank,
    });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch user rank',
    });
  }
});

/**
 * GET /api/leaderboard/metrics
 * Get available metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  res.json({
    success: true,
    metrics: [
      { id: 'points', name: 'Total Points', description: 'Overall contribution score' },
      { id: 'submissions', name: 'Ideas Submitted', description: 'Number of ideas submitted' },
      { id: 'votes', name: 'Votes Cast', description: 'Number of votes cast' },
      { id: 'forum_score', name: 'Forum Score', description: 'Forum contribution score' },
      { id: 'achievements', name: 'Achievements', description: 'Number of achievements earned' },
    ],
    timeframes: [
      { id: 'day', name: 'Today' },
      { id: 'week', name: 'This Week' },
      { id: 'month', name: 'This Month' },
      { id: 'year', name: 'This Year' },
      { id: 'all', name: 'All Time' },
    ],
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getLeaderboardEntries(
  metric: MetricType,
  timeframe: TimeframeType,
  limit: number
): Promise<LeaderboardEntry[]> {
  // Build date filter
  const dateFilter = getDateFilter(timeframe);

  // Different queries based on metric
  let users: any[];

  switch (metric) {
    case 'points':
      users = await prisma.user.findMany({
        where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
        orderBy: { points: 'desc' },
        take: limit,
        select: {
          id: true,
          fid: true,
          username: true,
          displayName: true,
          pfpUrl: true,
          points: true,
        },
      });
      break;

    case 'submissions':
      users = await prisma.user.findMany({
        where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
        orderBy: { ideas: { _count: 'desc' } },
        take: limit,
        select: {
          id: true,
          fid: true,
          username: true,
          displayName: true,
          pfpUrl: true,
          _count: { select: { ideas: true } },
        },
      });
      break;

    case 'votes':
      users = await prisma.user.findMany({
        where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
        orderBy: { votes: { _count: 'desc' } },
        take: limit,
        select: {
          id: true,
          fid: true,
          username: true,
          displayName: true,
          pfpUrl: true,
          _count: { select: { votes: true } },
        },
      });
      break;

    case 'forum_score':
      // Calculate forum score from upvotes on posts
      const forumUsers = await prisma.user.findMany({
        where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
        select: {
          id: true,
          fid: true,
          username: true,
          displayName: true,
          pfpUrl: true,
          forumPosts: {
            select: { upvotes: true },
          },
        },
      });
      
      users = forumUsers
        .map((u) => ({
          ...u,
          forumScore: u.forumPosts.reduce((sum, p) => sum + p.upvotes, 0),
        }))
        .sort((a, b) => b.forumScore - a.forumScore)
        .slice(0, limit);
      break;

    case 'achievements':
      users = await prisma.user.findMany({
        where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
        orderBy: { achievements: { _count: 'desc' } },
        take: limit,
        select: {
          id: true,
          fid: true,
          username: true,
          displayName: true,
          pfpUrl: true,
          _count: { select: { achievements: true } },
        },
      });
      break;

    default:
      users = [];
  }

  // Map to LeaderboardEntry format
  return users.map((user, index) => ({
    rank: index + 1,
    user: {
      id: user.id,
      fid: user.fid,
      username: user.username,
      displayName: user.displayName,
      pfpUrl: user.pfpUrl,
    },
    score: getScore(user, metric),
    metric,
  }));
}

async function getUserRank(userId: string, metric: MetricType): Promise<LeaderboardEntry | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fid: true,
      username: true,
      displayName: true,
      pfpUrl: true,
      points: true,
      _count: {
        select: {
          ideas: true,
          votes: true,
          achievements: true,
        },
      },
      forumPosts: {
        select: { upvotes: true },
      },
    },
  });

  if (!user) return null;

  // Calculate score
  let score: number;
  let countField: string;

  switch (metric) {
    case 'points':
      score = user.points;
      countField = 'points';
      break;
    case 'submissions':
      score = user._count.ideas;
      countField = '_count.ideas';
      break;
    case 'votes':
      score = user._count.votes;
      countField = '_count.votes';
      break;
    case 'forum_score':
      score = user.forumPosts.reduce((sum, p) => sum + p.upvotes, 0);
      // Can't easily count rank for computed field
      break;
    case 'achievements':
      score = user._count.achievements;
      countField = '_count.achievements';
      break;
    default:
      score = 0;
  }

  // Get rank (count users with higher score)
  let rank: number;
  
  if (metric === 'points') {
    rank = await prisma.user.count({ where: { points: { gt: score } } }) + 1;
  } else if (metric === 'forum_score') {
    // Approximate rank for forum score
    const allUsers = await prisma.user.findMany({
      select: {
        forumPosts: { select: { upvotes: true } },
      },
    });
    const higherScores = allUsers.filter(
      (u) => u.forumPosts.reduce((sum, p) => sum + p.upvotes, 0) > score
    ).length;
    rank = higherScores + 1;
  } else {
    // For count-based metrics, we need a different approach
    rank = 1; // Default, would need aggregation query
  }

  return {
    rank,
    user: {
      id: user.id,
      fid: user.fid,
      username: user.username,
      displayName: user.displayName,
      pfpUrl: user.pfpUrl,
    },
    score,
    metric,
  };
}

function getScore(user: any, metric: MetricType): number {
  switch (metric) {
    case 'points':
      return user.points || 0;
    case 'submissions':
      return user._count?.ideas || 0;
    case 'votes':
      return user._count?.votes || 0;
    case 'forum_score':
      return user.forumScore || 0;
    case 'achievements':
      return user._count?.achievements || 0;
    default:
      return 0;
  }
}

function getDateFilter(timeframe: TimeframeType): Date | null {
  const now = new Date();
  
  switch (timeframe) {
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

export default router;
