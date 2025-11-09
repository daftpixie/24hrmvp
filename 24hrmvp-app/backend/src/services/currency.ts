import { prisma } from '../db/client';
import { emitToRoom } from '../services/websocket';

// Extended Prisma schema for currency
const CURRENCY_SCHEMA = `
model CurrencyTransaction {
  id          String   @id @default(cuid())
  userId      String
  amount      Int
  type        String   // EARNED, SPENT, PURCHASED, BONUS
  description String
  metadata    Json?
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([type])
  @@index([createdAt])
}

model UserWallet {
  id          String   @id @default(cuid())
  userId      String   @unique
  credits     Int      @default(0)
  premium     Int      @default(0)  // Premium currency
  totalEarned Int      @default(0)
  totalSpent  Int      @default(0)
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id])
}
`;

export class CurrencyService {
  // Credit earning rates
  private readonly EARN_RATES = {
    idea_submission: 50,
    idea_featured: 200,
    vote_cast: 5,
    daily_login: 10,
    streak_bonus: 25,
    achievement: 100,
    mvp_win: 5000,
    referral: 100
  };

  // Spending options
  private readonly SPEND_OPTIONS = {
    boost_idea: 100,      // Boost idea visibility
    extra_vote: 50,       // Cast additional weighted vote
    custom_badge: 500,    // Custom profile badge
    priority_review: 200, // Priority MVP review
    skip_ads: 1000       // Monthly ad-free
  };

  async awardCredits(
    userId: string, 
    amount: number, 
    type: string, 
    description: string,
    metadata?: any
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.currencyTransaction.create({
        data: {
          userId,
          amount,
          type: 'EARNED',
          description,
          metadata
        }
      });

      // Update wallet
      const wallet = await tx.userWallet.upsert({
        where: { userId },
        create: {
          userId,
          credits: amount,
          totalEarned: amount
        },
        update: {
          credits: { increment: amount },
          totalEarned: { increment: amount }
        }
      });

      // Update user points (for leaderboard)
      await tx.user.update({
        where: { id: userId },
        data: {
          points: { increment: Math.floor(amount / 10) }
        }
      });

      // Emit notification
      emitToRoom(`user:${userId}`, 'credits:earned', {
        amount,
        description,
        balance: wallet.credits
      });

      return { transaction, wallet };
    });
  }

  async spendCredits(
    userId: string,
    amount: number,
    type: string,
    description: string
  ): Promise<any> {
    // Check balance
    const wallet = await prisma.userWallet.findUnique({
      where: { userId }
    });

    if (!wallet || wallet.credits < amount) {
      throw new Error('Insufficient credits');
    }

    return await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.currencyTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'SPENT',
          description
        }
      });

      // Update wallet
      const updatedWallet = await tx.userWallet.update({
        where: { userId },
        data: {
          credits: { decrement: amount },
          totalSpent: { increment: amount }
        }
      });

      return { transaction, wallet: updatedWallet };
    });
  }

  async getWallet(userId: string): Promise<any> {
    return await prisma.userWallet.findUnique({
      where: { userId },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });
  }

  async getTransactionHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    return await prisma.currencyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // Daily rewards system
  async claimDailyReward(userId: string): Promise<any> {
    const lastClaim = await redis.get(`daily:${userId}`);
    
    if (lastClaim) {
      const lastClaimTime = parseInt(lastClaim);
      const hoursSinceLastClaim = (Date.now() - lastClaimTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastClaim < 23) {
        throw new Error('Daily reward already claimed');
      }
    }

    // Calculate streak
    const streak = await this.getStreak(userId);
    const baseReward = this.EARN_RATES.daily_login;
    const streakBonus = Math.min(streak * 5, 100); // Max 100 bonus
    const totalReward = baseReward + streakBonus;

    // Award credits
    const result = await this.awardCredits(
      userId,
      totalReward,
      'DAILY',
      `Daily reward (${streak} day streak)`,
      { streak }
    );

    // Update streak
    await redis.setex(`daily:${userId}`, 86400, Date.now().toString());
    await redis.incr(`streak:${userId}`);

    return {
      ...result,
      streak: streak + 1,
      nextClaimIn: 86400000 // 24 hours in ms
    };
  }

  private async getStreak(userId: string): Promise<number> {
    const streak = await redis.get(`streak:${userId}`);
    return streak ? parseInt(streak) : 0;
  }
}

export default new CurrencyService();
