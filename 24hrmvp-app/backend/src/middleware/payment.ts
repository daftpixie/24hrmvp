import { Request, Response, NextFunction } from 'express';
import { verifyPayment, PaymentMethod } from '../services/payment';
import { prisma } from '../services/database';

export interface PaymentConfig {
  standard: number;    // $1.00
  priority: number;    // $5.00
  premium: number;     // $20.00
}

const PRICING: PaymentConfig = {
  standard: 1.00,
  priority: 5.00,
  premium: 20.00
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      paymentVerified?: boolean;
      paymentTier?: keyof PaymentConfig;
      paymentId?: string;
    }
  }
}

export function requirePayment(tier: keyof PaymentConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId, paymentMethod } = req.body;

      if (!paymentId || !paymentMethod) {
        return res.status(402).json({
          error: 'Payment required',
          tier,
          amount: PRICING[tier],
          acceptedMethods: ['stripe', 'coinbase']
        });
      }

      // Verify payment
      const verified = await verifyPayment(paymentId, paymentMethod as PaymentMethod);

      if (!verified) {
        return res.status(402).json({
          error: 'Payment verification failed',
          tier,
          amount: PRICING[tier]
        });
      }

      // Check if payment already used
      const existingPayment = await prisma.payment.findUnique({
        where: { paymentId }
      });

      if (existingPayment) {
        return res.status(409).json({
          error: 'Payment already used'
        });
      }

      // Record payment
      await prisma.payment.create({
        data: {
          paymentId,
          method: paymentMethod,
          amount: PRICING[tier],
          tier,
          userId: req.user!.id,
          status: 'completed'
        }
      });

      // Attach payment info to request
      req.paymentVerified = true;
      req.paymentTier = tier;
      req.paymentId = paymentId;

      next();
    } catch (error) {
      console.error('Payment middleware error:', error);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  };
}

export function optionalPayment() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { paymentId, paymentMethod } = req.body;

    if (!paymentId || !paymentMethod) {
      req.paymentVerified = false;
      return next();
    }

    try {
      const verified = await verifyPayment(paymentId, paymentMethod as PaymentMethod);
      req.paymentVerified = verified;
      
      if (verified) {
        // Record payment
        const payment = await prisma.payment.create({
          data: {
            paymentId,
            method: paymentMethod,
            amount: 0, // Free tier with optional payment
            tier: 'standard',
            userId: req.user!.id,
            status: 'completed'
          }
        });
        req.paymentId = payment.id;
      }
    } catch (error) {
      console.error('Optional payment error:', error);
      req.paymentVerified = false;
    }

    next();
  };
}

export { PRICING };
