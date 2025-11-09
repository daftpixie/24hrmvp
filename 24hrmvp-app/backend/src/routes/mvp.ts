import express, { Response } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { prisma } from '../db/client';

const router = express.Router();

// POST /api/mvp/build - Trigger MVP build (admin/winner only)
router.post('/build', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { ideaId } = req.body;

    if (!ideaId) {
      return res.status(400).json({
        success: false,
        error: 'Idea ID required',
      });
    }

    // Check if idea exists
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      include: { mvpProject: true },
    });

    if (!idea) {
      return res.status(404).json({
        success: false,
        error: 'Idea not found',
      });
    }

    if (idea.mvpProject) {
      return res.status(400).json({
        success: false,
        error: 'MVP already exists for this idea',
      });
    }

    // Create MVP project
    const mvpProject = await prisma.mVPProject.create({
      data: {
        ideaId,
        status: 'queued',
        progress: 0,
        logs: [],
      },
    });

    // TODO: Trigger Claude Sonnet 4.5 orchestration in background
    // This will be implemented in the Claude service

    return res.status(201).json({
      success: true,
      data: mvpProject,
      message: 'MVP build queued',
    });
  } catch (error) {
    console.error('Build MVP error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to queue MVP build',
    });
  }
});

// GET /api/mvp/:projectId/status - Get MVP build status
router.get('/:projectId/status', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.mVPProject.findUnique({
      where: { id: projectId },
      include: {
        idea: {
          select: {
            title: true,
            description: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'MVP project not found',
      });
    }

    return res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Get MVP status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch MVP status',
    });
  }
});

export default router;
