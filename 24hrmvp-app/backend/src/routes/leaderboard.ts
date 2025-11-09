import express, { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db/client';

const router = express.Router();

// GET /api/leaderboard - Get user rankings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'points', limit = '50' } = req.query as Record<string, string>;
    const limitNum = Math.min(parseInt(limit, 10), 100);

    let orderBy: any = { points: 'desc' };

    if (type === 'submissions') {
      orderBy = { ideas: { _count: 'desc' } };
    } else if (type === 'votes') {
      orderBy = { votes: { _count: 'desc' } };
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
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
      },
      orderBy,
      take: limitNum,
    });

    return res.json({
      success: true,
      data: users.map((user, index) => ({
        rank: index + 1,
        ...user,
      })),
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
    });
  }
});

export default router;
