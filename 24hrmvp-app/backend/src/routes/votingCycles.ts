import express, { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db/client';

const router = express.Router();

// GET /api/voting-cycles/active - Get current active voting cycle
router.get('/active', async (_req: AuthRequest, res: Response) => {
  try {
    const activeCycle = await prisma.votingCycle.findFirst({
      where: { status: 'active' },
      include: {
        ideas: {
          include: {
            submittedBy: {
              select: {
                username: true,
                displayName: true,
                pfpUrl: true,
              },
            },
            _count: {
              select: { votes: true },
            },
          },
          orderBy: { voteCount: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeCycle) {
      return res.status(404).json({
        success: false,
        error: 'No active voting cycle',
      });
    }

    // Calculate time remaining
    const now = new Date();
    const timeRemaining = activeCycle.endDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));

    return res.json({
      success: true,
      data: {
        ...activeCycle,
        daysRemaining,
      },
    });
  } catch (error) {
    console.error('Get active cycle error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch active voting cycle',
    });
  }
});

// POST /api/voting-cycles - Create new voting cycle (admin only - TODO: add admin auth)
router.post('/', async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Close any existing active cycles
    await prisma.votingCycle.updateMany({
      where: { status: 'active' },
      data: { status: 'completed' },
    });

    const cycle = await prisma.votingCycle.create({
      data: {
        startDate: now,
        endDate,
        status: 'active',
      },
    });

    return res.status(201).json({
      success: true,
      data: cycle,
    });
  } catch (error) {
    console.error('Create cycle error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create voting cycle',
    });
  }
});

export default router;
