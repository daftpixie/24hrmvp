import express, { Response } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { votingLimiter } from '../middleware/security';
import votingService from '../services/voting';
import { emitToRoom } from '../services/websocket';
import { z } from 'zod';

const router = express.Router();

const castVoteSchema = z.object({
  ideaId: z.string().cuid()
});

// POST /api/votes - Cast vote with integrity checks
router.post('/', 
  authenticateUser, 
  votingLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { ideaId } = castVoteSchema.parse(req.body);
      
      // Get IP for fraud detection
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      // Process vote with all checks
      const result = await votingService.processVote(
        req.user!.userId,
        ideaId,
        ipAddress
      );

      // Emit real-time update
      emitToRoom('voting', 'vote:update', {
        ideaId,
        voteCount: result.vote.idea.voteCount,
        weight: result.weight
      });

      return res.status(201).json({
        success: true,
        data: {
          vote: result.vote,
          weight: result.weight,
          message: `Vote cast with weight ${result.weight}`
        }
      });
    } catch (error) {
      console.error('Vote error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cast vote'
      });
    }
  }
);

// GET /api/votes/weight - Get user's voting weight
router.get('/weight', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const weight = await votingService.calculateVoteWeight(req.user!.userId);
    
    return res.json({
      success: true,
      data: weight
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate vote weight'
    });
  }
});

// GET /api/votes/integrity/:cycleId - Check for manipulation (admin)
router.get('/integrity/:cycleId', 
  authenticateUser,
  async (req: AuthRequest, res: Response) => {
    try {
      // Check admin permission
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId }
      });
      
      if (user?.membershipTier !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const patterns = await votingService.detectVoteManipulation(req.params.cycleId);
      
      return res.json({
        success: true,
        data: {
          suspicious: patterns.length > 0,
          patterns
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to check integrity'
      });
    }
  }
);

export default router;
