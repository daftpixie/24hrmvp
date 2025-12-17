import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePayment } from '../middleware/payment';
import { prisma } from '../index';

const router = Router();

// Submit idea with standard payment (1 vote)
router.post('/standard', authenticate, requirePayment('standard'), async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { title, description, category, complexity, tags, attachments } = req.body;
  const paymentId = req.body.paymentId || req.query.paymentId;

  try {
    const activeCycle = await prisma.votingCycle.findFirst({
      where: { status: 'active' }
    });

    if (!activeCycle) {
      res.status(400).json({ error: 'No active voting cycle' });
      return;
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        category,
        complexity: complexity || 'medium',
        tags: tags || [],
        attachments: attachments || [],
        userId: req.user.id,
        votingCycleId: activeCycle.id,
        status: 'approved',
        voteCount: 1,
      },
      include: {
        submittedBy: {
          select: {
            username: true,
            displayName: true,
            pfpUrl: true,
          }
        }
      }
    });

    await prisma.pointHistory.create({
      data: {
        userId: req.user.id,
        points: 10,
        action: 'idea_submitted_paid',
        description: `Submitted idea: ${title} (Standard tier)`,
        sourceId: idea.id,
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { points: { increment: 10 } }
    });

    res.status(201).json({
      success: true,
      idea,
      payment: { tier: 'standard', paymentId }
    });
  } catch (error) {
    console.error('Paid idea submission error:', error);
    res.status(500).json({ error: 'Failed to submit idea' });
  }
});

// Submit idea with priority payment (3 votes + 1 boost)
router.post('/priority', authenticate, requirePayment('priority'), async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { title, description, category, complexity, tags, attachments } = req.body;
  const paymentId = req.body.paymentId || req.query.paymentId;

  try {
    const activeCycle = await prisma.votingCycle.findFirst({
      where: { status: 'active' }
    });

    if (!activeCycle) {
      res.status(400).json({ error: 'No active voting cycle' });
      return;
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        category,
        complexity: complexity || 'medium',
        tags: tags || [],
        attachments: attachments || [],
        userId: req.user.id,
        votingCycleId: activeCycle.id,
        status: 'approved',
        voteCount: 3,
        voteWeight: 5,
      },
      include: {
        submittedBy: {
          select: {
            username: true,
            displayName: true,
            pfpUrl: true,
          }
        }
      }
    });

    await prisma.pointHistory.create({
      data: {
        userId: req.user.id,
        points: 25,
        action: 'idea_submitted_priority',
        description: `Submitted priority idea: ${title}`,
        sourceId: idea.id,
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { points: { increment: 25 } }
    });

    res.status(201).json({
      success: true,
      idea,
      payment: { tier: 'priority', paymentId }
    });
  } catch (error) {
    console.error('Priority idea submission error:', error);
    res.status(500).json({ error: 'Failed to submit priority idea' });
  }
});

// Submit idea with premium payment (10 votes + 3 boosts)
router.post('/premium', authenticate, requirePayment('premium'), async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { title, description, category, complexity, tags, attachments } = req.body;
  const paymentId = req.body.paymentId || req.query.paymentId;

  try {
    const activeCycle = await prisma.votingCycle.findFirst({
      where: { status: 'active' }
    });

    if (!activeCycle) {
      res.status(400).json({ error: 'No active voting cycle' });
      return;
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        category,
        complexity: complexity || 'complex',
        tags: tags || [],
        attachments: attachments || [],
        userId: req.user.id,
        votingCycleId: activeCycle.id,
        status: 'approved',
        voteCount: 10,
        voteWeight: 20,
      },
      include: {
        submittedBy: {
          select: {
            username: true,
            displayName: true,
            pfpUrl: true,
          }
        }
      }
    });

    await prisma.pointHistory.create({
      data: {
        userId: req.user.id,
        points: 50,
        action: 'idea_submitted_premium',
        description: `Submitted premium idea: ${title}`,
        sourceId: idea.id,
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { points: { increment: 50 } }
    });

    res.status(201).json({
      success: true,
      idea,
      payment: { tier: 'premium', paymentId }
    });
  } catch (error) {
    console.error('Premium idea submission error:', error);
    res.status(500).json({ error: 'Failed to submit premium idea' });
  }
});

export default router;
