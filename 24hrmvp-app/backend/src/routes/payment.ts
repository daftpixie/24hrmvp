import express from 'express';
import { createPayment, verifyPayment, refundPayment } from '../services/payment';
import { authenticate } from '../middleware/auth';
import { PRICING } from '../middleware/payment';

const router = express.Router();

// Create payment intent (Stripe or Coinbase charge)
router.post('/create', authenticate, async (req, res) => {
  try {
    const { amount, method, tier, description } = req.body;

    // Validate payment method
    if (!['stripe', 'coinbase'].includes(method)) {
      return res.status(400).json({ 
        error: 'Invalid payment method',
        acceptedMethods: ['stripe', 'coinbase']
      });
    }

    // Validate tier
    if (tier && !['standard', 'priority', 'premium'].includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier',
        availableTiers: Object.keys(PRICING)
      });
    }

    const finalAmount = tier ? PRICING[tier as keyof typeof PRICING] : amount;

    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const payment = await createPayment(
      finalAmount,
      method,
      req.user!.id,
      description || 'Platform submission'
    );

    res.json(payment);
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Verify payment status
router.get('/verify/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { method } = req.query;

    if (!method || !['stripe', 'coinbase'].includes(method as string)) {
      return res.status(400).json({ error: 'Payment method required' });
    }

    const verified = await verifyPayment(paymentId, method as 'stripe' | 'coinbase');

    res.json({ verified, paymentId, method });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Refund payment (Stripe only)
router.post('/refund', authenticate, async (req, res) => {
  try {
    const { paymentId, method, amount } = req.body;

    if (method !== 'stripe') {
      return res.status(400).json({ 
        error: 'Only Stripe payments can be refunded programmatically',
        note: 'Coinbase Commerce refunds must be processed manually'
      });
    }

    const refunded = await refundPayment(paymentId, method, amount);

    res.json({ refunded, paymentId });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Get pricing info
router.get('/pricing', (req, res) => {
  res.json({
    tiers: PRICING,
    methods: ['stripe', 'coinbase'],
    currency: 'USD'
  });
});

export default router;
