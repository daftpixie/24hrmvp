import express, { Request, Response } from 'express';
import { prisma } from '../db/client';

const router = express.Router();

// POST /api/webhook - Handle Farcaster webhook events
router.post('/', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    console.info('Received webhook event:', event);

    // Handle different event types
    switch (event) {
      case 'frame.added':
        // Handle frame added to Farcaster
        console.info('Frame added:', data);
        break;

      case 'notification.created':
        // Store notification token
        if (data.fid && data.token) {
          await prisma.notificationToken.upsert({
            where: { token: data.token },
            update: { enabled: true },
            create: {
              token: data.token,
              notificationUrl: data.url || '',
              userId: data.userId || '',
              enabled: true,
            },
          });
        }
        break;

      default:
        console.info('Unhandled webhook event:', event);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
});

export default router;
