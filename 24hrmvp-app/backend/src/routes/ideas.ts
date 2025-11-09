import express, { Response } from 'express';
import { authenticateUser, AuthRequest, optionalAuth } from '../middleware/auth';
import { prisma } from '../db/client';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createIdeaSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(1000),
  category: z.string(),
  complexity: z.enum(['low', 'medium', 'high']),
  attachments: z.array(z.string().url()).optional(),
});

// POST /api/ideas - Submit new idea
router.post('/', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const validatedData = createIdeaSchema.parse(req.body);

    // Get active voting cycle
    const activeCycle = await prisma.votingCycle.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeCycle) {
      return res.status(400).json({
        success: false,
        error: 'No active voting cycle',
      });
    }

    // Create idea
    const idea = await prisma.idea.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        complexity: validatedData.complexity,
        attachments: validatedData.attachments || [],
        userId: req.user.userId,
        votingCycleId: activeCycle.id,
        status: 'pending',
      },
      include: {
        submittedBy: {
          select: {
            username: true,
            displayName: true,
            pfpUrl: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: idea,
    });
  } catch (error) {
    console.error('Create idea error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.errors,
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to create idea',
    });
  }
});

// GET /api/ideas - List ideas with filters
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      category,
      votingCycleId,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (votingCycleId) where.votingCycleId = votingCycleId;

    const [ideas, total] = await Promise.all([
      prisma.idea.findMany({
        where,
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
        orderBy: [{ voteCount: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
      }),
      prisma.idea.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        ideas,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('List ideas error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ideas',
    });
  }
});

// GET /api/ideas/:id - Get single idea
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const idea = await prisma.idea.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: {
            username: true,
            displayName: true,
            pfpUrl: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
        mvpProject: true,
      },
    });

    if (!idea) {
      return res.status(404).json({
        success: false,
        error: 'Idea not found',
      });
    }

    return res.json({
      success: true,
      data: idea,
    });
  } catch (error) {
    console.error('Get idea error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch idea',
    });
  }
});

export default router;
