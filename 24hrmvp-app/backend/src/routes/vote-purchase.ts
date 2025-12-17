// backend/src/routes/vote-purchase.ts
// VOTE PURCHASING WITH STRIPE, COINBASE COMMERCE, AND POINTS

import { Router, Request, Response } from 'express';
import { verifyFarcasterAuth } from '../middleware/auth';
import { prisma } from '../index';
import Stripe from 'stripe';
import { z } from 'zod';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

const PurchaseVotesSchema = z.object({
  packageId: z.string(), // e.g., "single", "pack_5", "pack_20", "pack_100"
  paymentMethod: z.enum(['stripe', 'coinbase', 'points']),
  returnUrl: z.string().url().optional(), // For Stripe redirects
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get or create vote pricing packages
 */
async function ensureVotePricing() {
  const packages = [
    {
      packageName: 'single',
      voteCount: 1,
      priceUsd: 1.00,
      priceUsdc: 1.00,
      pricePoints: 100,
      displayName: '1 Extra Vote',
      description: 'Add one extra vote to your account',
      sortOrder: 1,
    },
    {
      packageName: 'pack_5',
      voteCount: 5,
      priceUsd: 4.00,
      priceUsdc: 4.00,
      pricePoints: 400,
      displayName: '5 Vote Pack',
      description: 'Save 20% with 5 votes',
      isPopular: true,
      sortOrder: 2,
    },
    {
      packageName: 'pack_20',
      voteCount: 20,
      priceUsd: 12.00,
      priceUsdc: 12.00,
      pricePoints: 1200,
      displayName: '20 Vote Pack',
      description: 'Save 40% with 20 votes',
      sortOrder: 3,
    },
    {
      packageName: 'pack_100',
      voteCount: 100,
      priceUsd: 50.00,
      priceUsdc: 50.00,
      pricePoints: 5000,
      displayName: '100 Vote Pack',
      description: 'Maximum value - 50% savings',
      sortOrder: 4,
    },
  ];

  for (const pkg of packages) {
    await prisma.votePricing.upsert({
      where: { packageName: pkg.packageName },
      update: pkg,
      create: pkg,
    });
  }
}

/**
 * Calculate user's available vote credits
 */
async function getAvailableVoteCredits(userId: string): Promise<number> {
  const credits = await prisma.voteCredit.findMany({
    where: {
      userId,
      isExpired: false,
      remaining: { gt: 0 },
      OR: [
        { expiresAt: { gt: new Date() } },
        { expiresAt: null },
      ],
    },
  });

  return credits.reduce((total, credit) => {
    const remaining = credit.amount - credit.consumed;
    return total + remaining;
  }, 0);
}

/**
 * Award free daily vote credits
 */
async function awardDailyVoteCredits(userId: string): Promise<void> {
  // Check if user already received today's credits
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingDaily = await prisma.voteCredit.findFirst({
    where: {
      userId,
      source: 'FREE_DAILY',
      createdAt: {
        gte: today,
      },
    },
  });

  if (!existingDaily) {
    // Award 3 free votes per day
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999); // Expires end of day

    await prisma.voteCredit.create({
      data: {
        userId,
        amount: 3,
        remaining: 3,
        source: 'FREE_DAILY',
        description: 'Daily free vote credits',
        expiresAt,
      },
    });
  }
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * GET /api/vote-purchase/pricing
 * Get available vote packages and pricing
 */
router.get('/pricing', async (req: Request, res: Response) => {
  try {
    await ensureVotePricing();

    const pricing = await prisma.votePricing.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      pricing,
    });

  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve pricing',
    });
  }
});

/**
 * GET /api/vote-purchase/credits
 * Get user's available vote credits
 */
router.get('/credits', verifyFarcasterAuth, async (req: Request, res: Response) => {
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
        credits: {
          total: 0,
          bySource: {},
        },
      });
    }

    // Award daily credits if applicable
    await awardDailyVoteCredits(user.id);

    // Get all active credits
    const credits = await prisma.voteCredit.findMany({
      where: {
        userId: user.id,
        isExpired: false,
        remaining: { gt: 0 },
        OR: [
          { expiresAt: { gt: new Date() } },
          { expiresAt: null },
        ],
      },
      orderBy: {
        createdAt: 'asc', // Use oldest credits first
      },
    });

    const bySource = credits.reduce((acc, credit) => {
      const remaining = credit.amount - credit.consumed;
      if (remaining > 0) {
        acc[credit.source] = (acc[credit.source] || 0) + remaining;
      }
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(bySource).reduce((sum, val) => sum + val, 0);

    res.json({
      success: true,
      credits: {
        total,
        bySource,
        details: credits.map(c => ({
          id: c.id,
          source: c.source,
          amount: c.amount,
          consumed: c.consumed,
          remaining: c.amount - c.consumed,
          expiresAt: c.expiresAt,
        })),
      },
    });

  } catch (error) {
    console.error('Get credits error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve credits',
    });
  }
});

/**
 * POST /api/vote-purchase/stripe
 * Purchase votes via Stripe
 */
router.post('/stripe', verifyFarcasterAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const validation = PurchaseVotesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: validation.error.errors,
      });
    }

    const { packageId, returnUrl } = validation.data;

    // Get user
    const user = await prisma.user.upsert({
      where: { fid: req.user.fid },
      update: { lastActiveAt: new Date() },
      create: {
        fid: req.user.fid,
        username: req.user.username,
        displayName: req.user.displayName,
        pfpUrl: req.user.pfpUrl,
      },
    });

    // Get pricing package
    const package_ = await prisma.votePricing.findUnique({
      where: { packageName: packageId },
    });

    if (!package_ || !package_.isActive) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid package ID',
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: package_.displayName,
              description: package_.description || undefined,
            },
            unit_amount: Math.round(parseFloat(package_.priceUsd.toString()) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: returnUrl || `${process.env.FRONTEND_URL}/vote/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnUrl || `${process.env.FRONTEND_URL}/vote`,
      metadata: {
        userId: user.id,
        voteCount: package_.voteCount.toString(),
        packageId: package_.packageName,
      },
    });

    // Create pending purchase record
    const purchase = await prisma.votePurchase.create({
      data: {
        userId: user.id,
        voteCredits: package_.voteCount,
        amount: package_.priceUsd,
        currency: 'usd',
        paymentMethod: 'stripe',
        status: 'PENDING',
        paymentId: session.id,
        metadata: {
          packageId: package_.packageName,
          sessionUrl: session.url,
        },
      },
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      purchaseId: purchase.id,
    });

  } catch (error) {
    console.error('Stripe purchase error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create Stripe session',
    });
  }
});

/**
 * POST /api/vote-purchase/coinbase
 * Purchase votes via Coinbase Commerce (USDC on Base)
 */
router.post('/coinbase', verifyFarcasterAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const validation = PurchaseVotesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: validation.error.errors,
      });
    }

    const { packageId } = validation.data;

    // Get user
    const user = await prisma.user.upsert({
      where: { fid: req.user.fid },
      update: { lastActiveAt: new Date() },
      create: {
        fid: req.user.fid,
        username: req.user.username,
        displayName: req.user.displayName,
        pfpUrl: req.user.pfpUrl,
      },
    });

    // Get pricing package
    const package_ = await prisma.votePricing.findUnique({
      where: { packageName: packageId },
    });

    if (!package_ || !package_.isActive) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid package ID',
      });
    }

    // Create pending purchase
    const purchase = await prisma.votePurchase.create({
      data: {
        userId: user.id,
        voteCredits: package_.voteCount,
        amount: package_.priceUsdc,
        currency: 'usdc',
        paymentMethod: 'coinbase',
        status: 'PENDING',
        metadata: {
          packageId: package_.packageName,
          chainId: 8453, // Base
          tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
        },
      },
    });

    // Return payment details for x402 or Coinbase SDK
    res.json({
      success: true,
      purchaseId: purchase.id,
      payment: {
        amount: package_.priceUsdc.toString(),
        currency: 'USDC',
        chainId: 8453,
        tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        recipientAddress: process.env.COINBASE_RECIPIENT_ADDRESS,
        metadata: {
          purchaseId: purchase.id,
          packageId: package_.packageName,
        },
      },
    });

  } catch (error) {
    console.error('Coinbase purchase error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create Coinbase payment',
    });
  }
});

/**
 * POST /api/vote-purchase/points
 * Purchase votes using platform points
 */
router.post('/points', verifyFarcasterAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const validation = PurchaseVotesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: validation.error.errors,
      });
    }

    const { packageId } = validation.data;

    // Get user
    const user = await prisma.user.findUnique({
      where: { fid: req.user.fid },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Get pricing package
    const package_ = await prisma.votePricing.findUnique({
      where: { packageName: packageId },
    });

    if (!package_ || !package_.isActive) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid package ID',
      });
    }

    // Check if user has enough points
    if (user.points < package_.pricePoints) {
      return res.status(400).json({
        error: 'Insufficient Points',
        message: `You need ${package_.pricePoints} points but only have ${user.points}`,
      });
    }

    // Process purchase in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct points
      await tx.user.update({
        where: { id: user.id },
        data: {
          points: { decrement: package_.pricePoints },
        },
      });

      // Record point transaction
      await tx.pointHistory.create({
        data: {
          userId: user.id,
          points: -package_.pricePoints,
          action: 'vote_purchase',
          description: `Purchased ${package_.voteCount} vote credits`,
        },
      });

      // Create purchase record
      const purchase = await tx.votePurchase.create({
        data: {
          userId: user.id,
          voteCredits: package_.voteCount,
          amount: package_.pricePoints,
          currency: 'points',
          paymentMethod: 'points',
          status: 'COMPLETED',
          purchasedAt: new Date(),
          completedAt: new Date(),
          metadata: {
            packageId: package_.packageName,
          },
        },
      });

      // Award vote credits
      const credit = await tx.voteCredit.create({
        data: {
          userId: user.id,
          amount: package_.voteCount,
          remaining: package_.voteCount,
          source: 'PURCHASED_POINTS',
          description: `Purchased with ${package_.pricePoints} points`,
          purchaseId: purchase.id,
        },
      });

      return { purchase, credit };
    });

    res.json({
      success: true,
      purchase: result.purchase,
      credit: result.credit,
      message: `Successfully purchased ${package_.voteCount} vote credits!`,
    });

  } catch (error) {
    console.error('Points purchase error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to purchase with points',
    });
  }
});

/**
 * POST /api/vote-purchase/webhook/stripe
 * Stripe webhook handler for payment confirmations
 */
router.post('/webhook/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.userId;
      const voteCount = parseInt(session.metadata?.voteCount || '0');

      if (!userId || !voteCount) {
        console.error('Invalid metadata in Stripe session:', session.id);
        return res.sendStatus(400);
      }

      // Process purchase in transaction
      await prisma.$transaction(async (tx) => {
        // Update purchase record
        const purchase = await tx.votePurchase.findFirst({
          where: {
            paymentId: session.id,
            status: 'PENDING',
          },
        });

        if (!purchase) {
          console.error('Purchase not found for session:', session.id);
          return;
        }

        await tx.votePurchase.update({
          where: { id: purchase.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        // Award vote credits
        await tx.voteCredit.create({
          data: {
            userId,
            amount: voteCount,
            remaining: voteCount,
            source: 'PURCHASED_STRIPE',
            description: `Purchased via Stripe`,
            purchaseId: purchase.id,
          },
        });

        // Record payment
        await tx.payment.create({
          data: {
            userId,
            amount: session.amount_total! / 100,
            currency: session.currency || 'usd',
            status: 'completed',
            provider: 'stripe',
            providerTxId: session.payment_intent as string,
            votePurchaseId: purchase.id,
            itemType: 'vote_credits',
            itemQuantity: voteCount,
          },
        });
      });
    }

    res.sendStatus(200);

  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.sendStatus(400);
  }
});

export default router;