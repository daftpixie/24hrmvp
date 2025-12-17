import { Request, Response, NextFunction } from 'express';
import { verifyPayment, PaymentMethod } from '../services/payment';
import { prisma } from '../index';

export interface PaymentTier {
  name: string;
  price: number;
  votes: number;
  boosts: number;
}

export const PAYMENT_TIERS: PaymentTier[] = [
  { name: 'standard', price: 1, votes: 1, boosts: 0 },
  { name: 'priority', price: 5, votes: 3, boosts: 1 },
  { name: 'premium', price: 20, votes: 10, boosts: 3 },
];

export const requirePayment = (tier: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const paymentId = req.body.paymentId || req.query.paymentId;

    if (!paymentId) {
      res.status(402).json({
        error: 'Payment required',
        tier,
        tiers: PAYMENT_TIERS
      });
      return;
    }

    try {
      const existingPayment = await prisma.payment.findUnique({
        where: { providerTxId: paymentId }
      });

      if (existingPayment && existingPayment.status === 'completed') {
        next();
        return;
      }

      await prisma.payment.create({
        data: {
          userId: req.user.id,
          amount: PAYMENT_TIERS.find(t => t.name === tier)?.price || 0,
          currency: 'usd',
          status: 'pending',
          provider: PaymentMethod.STRIPE,
          providerTxId: paymentId,
        }
      });

      const verification = await verifyPayment(paymentId);

      if (verification.success && verification.status === 'completed') {
        next();
      } else {
        res.status(402).json({
          error: 'Payment verification failed',
          status: verification.status
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: 'Payment verification failed' });
    }
  };
};

export const optionalPayment = (tier: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const paymentId = req.body.paymentId || req.query.paymentId;

    if (!paymentId) {
      next();
      return;
    }

    try {
      const payment = await prisma.payment.create({
        data: {
          userId: req.user!.id,
          amount: PAYMENT_TIERS.find(t => t.name === tier)?.price || 0,
          currency: 'usd',
          status: 'pending',
          provider: PaymentMethod.STRIPE,
          providerTxId: paymentId,
        }
      });

      const verification = await verifyPayment(payment.providerTxId!);

      if (verification.success) {
        (req as any).paymentVerified = true;
        (req as any).paymentTier = tier;
      }
    } catch (error) {
      console.error('Optional payment error:', error);
    }

    next();
  };
};
