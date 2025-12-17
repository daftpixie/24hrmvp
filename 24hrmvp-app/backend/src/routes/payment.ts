import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { createPayment, verifyPayment, refundPayment } from '../services/payment';
import { PAYMENT_TIERS } from '../middleware/payment';

const router = Router();

router.post('/create', authenticate, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { tier = 'standard', currency = 'usd' } = req.body;
  
  const tierConfig = PAYMENT_TIERS.find(t => t.name === tier);
  
  if (!tierConfig) {
    res.status(400).json({ error: 'Invalid tier' });
    return;
  }

  try {
    const payment = await createPayment(
      req.user.id,
      tierConfig.price,
      currency
    );

    res.json(payment);
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

router.get('/verify/:paymentId', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { paymentId } = req.params;

  try {
    const result = await verifyPayment(paymentId);
    res.json(result);
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/refund', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { paymentId, reason } = req.body;

  try {
    const result = await refundPayment(paymentId, reason);
    res.json(result);
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Refund failed' });
  }
});

router.get('/pricing', (_req: Request, res: Response): void => {
  res.json({ tiers: PAYMENT_TIERS });
});

export default router;
