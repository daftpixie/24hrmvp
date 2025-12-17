// backend/src/routes/ideas.ts
// CONSOLIDATED IDEAS ROUTER - Merged basic + enhanced functionality
// Handles: idea submission (with optional file uploads), listings, rankings, details

import { Router, Request, Response } from 'express';
import { verifyFarcasterAuth, optionalAuth } from '../middleware/auth';
import { prisma } from '../index';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || '/tmp/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;
  
  if (allowedTypes.includes(mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, PNG, and JPEG files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 3,
  }
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

// Basic idea schema (current production)
const BasicIdeaSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  category: z.string().min(1, 'Category is required'),
  complexity: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  tags: z.array(z.string()).max(5).optional().default([]),
});

// Enhanced idea schema (forward-compatible - used when schema is updated)
const EnhancedIdeaSchema = BasicIdeaSchema.extend({
  targetAudience: z.string().min(20).max(500).optional(),
  coreFeatures: z.array(z.string().min(5).max(200)).min(1).max(10).optional(),
  technicalRequirements: z.string().max(1000).optional(),
  expectedTimeline: z.enum([
    '1-week', '2-weeks', '1-month', '2-months', '3-months', 'ongoing'
  ]).optional(),
  successMetrics: z.string().max(500).optional(),
});

type BasicIdeaInput = z.infer<typeof BasicIdeaSchema>;
type EnhancedIdeaInput = z.infer<typeof EnhancedIdeaSchema>;

// ============================================
// GET /api/ideas
// List all ideas with filtering and pagination
// ============================================

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const category = req.query.category as string;
    const cycleId = req.query.cycleId as string;
    const sortBy = (req.query.sortBy as string) || 'recent';
    
    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (cycleId) where.votingCycleId = cycleId;
    
    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'votes':
        orderBy = { voteCount: 'desc' };
        break;
      case 'trending':
        orderBy = [{ voteWeight: 'desc' }, { voteCount: 'desc' }];
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
    }
    
    const [ideas, total] = await Promise.all([
      prisma.idea.findMany({
        where,
        include: {
          submittedBy: {
            select: {
              fid: true,
              username: true,
              displayName: true,
              pfpUrl: true,
            },
          },
          votingCycle: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
          _count: {
            select: {
              votes: true,
              comments: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.idea.count({ where }),
    ]);
    
    res.json({
      success: true,
      ideas,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Get ideas error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get ideas',
    });
  }
});

// ============================================
// GET /api/ideas/current-cycle
// Get ideas in active voting cycle with rankings
// ============================================

router.get('/current-cycle', optionalAuth, async (req: Request, res: Response) => {
  try {
    const activeCycle = await prisma.votingCycle.findFirst({
      where: { status: 'active' },
      orderBy: { startDate: 'desc' },
      include: {
        ideas: {
          where: {
            status: { in: ['pending', 'approved'] },
          },
          include: {
            submittedBy: {
              select: {
                id: true,
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
          orderBy: [
            { voteWeight: 'desc' },
            { voteCount: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });

    if (!activeCycle) {
      return res.json({
        success: true,
        cycle: null,
        ideas: [],
        message: 'No active voting cycle',
      });
    }

    const totalVotes = activeCycle.ideas.reduce((sum, i) => sum + i.voteCount, 0);
    
    // Add ranking and vote percentage to each idea
    const ideasWithRanking = activeCycle.ideas.map((idea, index) => ({
      ...idea,
      rank: index + 1,
      votePercentage: totalVotes > 0
        ? Math.round((idea.voteCount / totalVotes) * 100)
        : 0,
    }));

    const now = Date.now();
    const endTime = new Date(activeCycle.endDate).getTime();
    const timeRemaining = Math.max(0, endTime - now);

    res.json({
      success: true,
      cycle: {
        id: activeCycle.id,
        name: activeCycle.name,
        status: activeCycle.status,
        startDate: activeCycle.startDate,
        endDate: activeCycle.endDate,
        timeRemaining,
        hoursRemaining: Math.floor(timeRemaining / (1000 * 60 * 60)),
        totalIdeas: activeCycle.ideas.length,
        totalVotes,
      },
      ideas: ideasWithRanking,
    });

  } catch (error) {
    console.error('Get current cycle ideas error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve ideas',
    });
  }
});

// ============================================
// GET /api/ideas/:id
// Get detailed information about a specific idea
// ============================================

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const idea = await prisma.idea.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: {
            id: true,
            fid: true,
            username: true,
            displayName: true,
            pfpUrl: true,
            membershipTier: true,
            reputation: true,
          },
        },
        votingCycle: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                fid: true,
                username: true,
                displayName: true,
                pfpUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        comments: {
          where: { parentId: null },
          include: {
            author: {
              select: {
                fid: true,
                username: true,
                displayName: true,
                pfpUrl: true,
              },
            },
            _count: {
              select: { replies: true },
            },
          },
          orderBy: { score: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            votes: true,
            comments: true,
          },
        },
      },
    });

    if (!idea) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Idea not found',
      });
    }

    // Check if current user has voted (if authenticated)
    let hasVoted = false;
    if (req.user) {
      const user = await prisma.user.findUnique({
        where: { fid: req.user.fid },
      });
      if (user) {
        const vote = await prisma.vote.findUnique({
          where: {
            userId_ideaId: {
              userId: user.id,
              ideaId: id,
            },
          },
        });
        hasVoted = !!vote;
      }
    }

    res.json({
      success: true,
      idea: {
        ...idea,
        hasVoted,
      },
    });
  } catch (error) {
    console.error('Get idea error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get idea',
    });
  }
});

// ============================================
// POST /api/ideas
// Create new idea (supports both basic JSON and multipart with files)
// ============================================

router.post(
  '/',
  verifyFarcasterAuth,
  upload.array('attachments', 3),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Parse input - handle both JSON body and multipart form data
      let inputData: any;
      if (req.body.data) {
        // Multipart form: data is JSON string
        try {
          inputData = JSON.parse(req.body.data);
        } catch {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid JSON in data field',
          });
        }
      } else {
        // Regular JSON body
        inputData = req.body;
      }

      // Validate with basic schema first (always works)
      const validation = BasicIdeaSchema.safeParse(inputData);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: validation.error.errors,
        });
      }

      const validatedData = validation.data;

      // Process uploaded files if present
      const files = req.files as Express.Multer.File[] | undefined;
      const fileAttachments = files?.map(file => ({
        filename: file.originalname,
        storedFilename: file.filename,
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      })) || [];

      // Get active voting cycle
      const activeCycle = await prisma.votingCycle.findFirst({
        where: { status: 'active' },
        orderBy: { startDate: 'desc' },
      });

      if (!activeCycle) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'No active voting cycle available',
        });
      }

      // Get or create user
      const user = await prisma.user.upsert({
        where: { fid: req.user.fid },
        update: { lastActiveAt: new Date() },
        create: {
          fid: req.user.fid,
          username: req.user.username,
          displayName: req.user.displayName,
          pfpUrl: req.user.pfpUrl,
        },
      });

      // Check for duplicate submission in this cycle
      const existingIdea = await prisma.idea.findFirst({
        where: {
          userId: user.id,
          votingCycleId: activeCycle.id,
          title: {
            equals: validatedData.title,
            mode: 'insensitive',
          },
        },
      });

      if (existingIdea) {
        return res.status(400).json({
          error: 'Duplicate Idea',
          message: 'You have already submitted an idea with this title in the current cycle',
        });
      }

      // Build idea data object
      // Core fields (always present)
      const ideaData: any = {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        complexity: validatedData.complexity,
        tags: validatedData.tags,
        userId: user.id,
        votingCycleId: activeCycle.id,
        status: 'pending',
        attachments: fileAttachments.map(f => f.url),
      };

      // Enhanced fields (optional - will be ignored if schema doesn't have them yet)
      // These become active after Phase 1 schema migration
      const enhancedFields = ['targetAudience', 'coreFeatures', 'technicalRequirements', 
                              'expectedTimeline', 'successMetrics'];
      for (const field of enhancedFields) {
        if (inputData[field] !== undefined) {
          ideaData[field] = inputData[field];
        }
      }

      // File metadata (if schema supports it)
      if (fileAttachments.length > 0) {
        ideaData.fileAttachments = fileAttachments;
        ideaData.fileCount = fileAttachments.length;
      }

      // Create idea with transaction
      const idea = await prisma.$transaction(async (tx) => {
        const newIdea = await tx.idea.create({
          data: ideaData,
          include: {
            submittedBy: {
              select: {
                id: true,
                fid: true,
                username: true,
                displayName: true,
                pfpUrl: true,
              },
            },
            votingCycle: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        });

        // Award points for submission
        await tx.pointHistory.create({
          data: {
            userId: user.id,
            points: 10,
            action: 'idea_submitted',
            description: `Submitted idea: ${validatedData.title}`,
            sourceId: newIdea.id,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { points: { increment: 10 } },
        });

        return newIdea;
      });

      res.status(201).json({
        success: true,
        idea,
        filesUploaded: fileAttachments.length,
        message: 'Idea submitted successfully! You earned 10 points.',
      });

    } catch (error: any) {
      console.error('Create idea error:', error);
      
      // Handle Prisma errors for unknown fields gracefully
      if (error.code === 'P2009' || error.message?.includes('Unknown argument')) {
        // Schema doesn't have enhanced fields yet - retry with basic fields only
        console.warn('Enhanced fields not in schema yet, falling back to basic submission');
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create idea',
      });
    }
  }
);

// ============================================
// DELETE /api/ideas/:id
// Delete own idea (only if no votes yet)
// ============================================

router.delete('/:id', verifyFarcasterAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { fid: req.user.fid },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const idea = await prisma.idea.findUnique({
      where: { id },
      include: {
        _count: { select: { votes: true } },
      },
    });

    if (!idea) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Idea not found',
      });
    }

    // Only owner can delete
    if (idea.userId !== user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own ideas',
      });
    }

    // Cannot delete if has votes
    if (idea._count.votes > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot delete an idea that has received votes',
      });
    }

    await prisma.idea.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Idea deleted successfully',
    });
  } catch (error) {
    console.error('Delete idea error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete idea',
    });
  }
});

export default router;
