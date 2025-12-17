import { Router, Request, Response } from 'express';
import { verifyFarcasterAuth } from '../middleware/auth';
import { prisma } from '../index';

const router = Router();

/**
 * POST /api/votes
 * Cast a vote for an idea
 */
router.post('/', verifyFarcasterAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    const { ideaId } = req.body;
    
    if (!ideaId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ideaId is required',
      });
    }
    
    // Get or create user
    const user = await prisma.user.upsert({
      where: { fid: req.user.fid },
      update: {
        lastActiveAt: new Date(),
      },
      create: {
        fid: req.user.fid,
        username: req.user.username,
        displayName: req.user.displayName,
        pfpUrl: req.user.pfpUrl,
      },
    });
    
    // Check if idea exists and is in active cycle
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      include: {
        votingCycle: true,
      },
    });
    
    if (!idea) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Idea not found',
      });
    }
    
    if (idea.votingCycle.status !== 'active') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Voting cycle is not active',
      });
    }
    
    // Check if user already voted for this idea
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_ideaId: {
          userId: user.id,
          ideaId,
        },
      },
    });
    
    if (existingVote) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You have already voted for this idea',
      });
    }
    
    // Calculate vote weight based on user reputation
    const voteWeight = Math.max(1, Math.floor(user.reputation / 100));
    
    // Create vote in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create vote
      const vote = await tx.vote.create({
        data: {
          userId: user.id,
          ideaId,
          weight: voteWeight,
        },
      });
      
      // Update idea vote count
      await tx.idea.update({
        where: { id: ideaId },
        data: {
          voteCount: { increment: 1 },
          voteWeight: { increment: voteWeight },
        },
      });
      
      // Award points
      await tx.pointHistory.create({
        data: {
          userId: user.id,
          points: 2,
          action: 'vote_cast',
          description: `Voted for: ${idea.title}`,
          sourceId: ideaId,
        },
      });
      
      await tx.user.update({
        where: { id: user.id },
        data: {
          points: { increment: 2 },
        },
      });
      
      return vote;
    });
    
    res.status(201).json({
      success: true,
      vote: result,
    });
  } catch (error) {
    console.error('Create vote error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to cast vote',
    });
  }
});

/**
 * GET /api/votes/my-votes
 * Get current user's voting history
 */
router.get('/my-votes', verifyFarcasterAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { fid: req.user.fid },
    });
    
    if (!user) {
      return res.json({
        success: true,
        votes: [],
      });
    }
    
    const votes = await prisma.vote.findMany({
      where: {
        userId: user.id,
      },
      include: {
        idea: {
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
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    res.json({
      success: true,
      votes,
    });
  } catch (error) {
    console.error('Get my votes error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get votes',
    });
  }
});

export default router;
