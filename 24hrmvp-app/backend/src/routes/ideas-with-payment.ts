import express from 'express';
import { authenticate } from '../middleware/auth';
import { requirePayment, optionalPayment } from '../middleware/payment';
import { prisma } from '../services/database';

const router = express.Router();

// Standard submission - requires payment
router.post('/submit/standard', 
  authenticate, 
  requirePayment('standard'),
  async (req, res) => {
    const idea = await prisma.idea.create({
      data: {
        ...req.body,
        userId: req.user!.id,
        tier: 'standard',
        paymentId: req.paymentId
      }
    });
    res.json(idea);
  }
);

// Priority submission - higher payment
router.post('/submit/priority', 
  authenticate, 
  requirePayment('priority'),
  async (req, res) => {
    const idea = await prisma.idea.create({
      data: {
        ...req.body,
        userId: req.user!.id,
        tier: 'priority',
        paymentId: req.paymentId,
        priorityBoost: true
      }
    });
    res.json(idea);
  }
);

// Premium submission - highest payment
router.post('/submit/premium', 
  authenticate, 
  requirePayment('premium'),
  async (req, res) => {
    const idea = await prisma.idea.create({
      data: {
        ...req.body,
        userId: req.user!.id,
        tier: 'premium',
        paymentId: req.paymentId,
        priorityBoost: true,
        featuredUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });
    res.json(idea);
  }
);

// Free tier with optional tip
router.post('/submit/free', 
  authenticate, 
  optionalPayment(),
  async (req, res) => {
    const idea = await prisma.idea.create({
      data: {
        ...req.body,
        userId: req.user!.id,
        tier: 'free',
        paymentId: req.paymentId || null
      }
    });
    res.json(idea);
  }
);

export default router;
