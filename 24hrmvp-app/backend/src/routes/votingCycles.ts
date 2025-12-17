import { Router, Request, Response } from 'express';
import { verifyFarcasterAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

/**
 * GET /api/cycles/active
 * Get current active voting cycle with ideas
 */
router.get('/active', optionalAuth, async (req: Request, res: Response) => {
  try {
    const activeCycle = await prisma.votingCycle.findFirst({
      where: { status: 'active' },
      include: {
        ideas: {
          where: { status: 'approved' },
          include: {
            submittedBy: {
              select: {
                fid: true,
                username: true,
                displayName: true,
                pfpUrl: true,
              },
            },
            _count: {
              select: {
                votes: true,
                comments: true,
              },
            },
          },
          orderBy: {
            voteCount: 'desc',
          },
        },
      },
    });
    
    if (!activeCycle) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active voting cycle',
      });
    }
    
    // Calculate time remaining
    const now = new Date();
    const endDate = new Date(activeCycle.endDate);
    const timeRemaining = endDate.getTime() - now.getTime();
    const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
    
    res.json({
      success: true,
      cycle: {
        ...activeCycle,
        hoursRemaining,
      },
    });
  } catch (error) {
    console.error('Get active cycle error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get active cycle',
    });
  }
});

/**
 * GET /api/cycles
 * Get all voting cycles
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const cycles = await prisma.votingCycle.findMany({
      include: {
        _count: {
          select: {
            ideas: true,
          },
        },
        winner: {
          select: {
            id: true,
            title: true,
            description: true,
            submittedBy: {
              select: {
                fid: true,
                username: true,
                displayName: true,
                pfpUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
      skip,
      take: limit,
    });
    
    const total = await prisma.votingCycle.count();
    
    res.json({
      success: true,
      cycles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get cycles error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get cycles',
    });
  }
});

/**
 * POST /api/cycles
 * Create new voting cycle (admin only)
 */
router.post('/', verifyFarcasterAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate } = req.body;
    
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'name, startDate, and endDate are required',
      });
    }
    
    const cycle = await prisma.votingCycle.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'active',
      },
    });
    
    res.status(201).json({
      success: true,
      cycle,
    });
  } catch (error) {
    console.error('Create cycle error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create cycle',
    });
  }
});

export default router;
