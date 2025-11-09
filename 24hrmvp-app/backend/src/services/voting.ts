import { prisma } from '../db/client';
import { redis, cache, rateLimiter } from './redis';
import { createHash } from 'crypto';

interface VoteWeight {
  base: number;
  multipliers: {
    accountAge: number;
    reputation: number;
    contribution: number;
    verification: number;
  };
  final: number;
}

export class VotingService {
  // Calculate dynamic vote weight
  async calculateVoteWeight(userId: string): Promise<VoteWeight> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { 
            ideas: true, 
            votes: true,
            achievements: true 
          }
        }
      }
    });

    if (!user) throw new Error('User not found');

    const now = Date.now();
    const accountAge = now - user.createdAt.getTime();
    const DAY_MS = 86400000;

    // Account age multiplier (0.25 - 1.5)
    let accountAgeMultiplier = 0.25;
    if (accountAge > 7 * DAY_MS) accountAgeMultiplier = 0.5;
    if (accountAge > 30 * DAY_MS) accountAgeMultiplier = 1.0;
    if (accountAge > 90 * DAY_MS) accountAgeMultiplier = 1.25;
    if (accountAge > 365 * DAY_MS) accountAgeMultiplier = 1.5;

    // Reputation multiplier (0.5 - 2.0)
    const reputationScore = user.points / 1000;
    const reputationMultiplier = Math.min(Math.max(0.5, reputationScore), 2.0);

    // Contribution multiplier (1.0 - 1.5)
    const contributions = user._count.ideas + (user._count.votes / 10);
    const contributionMultiplier = Math.min(1 + (contributions / 100), 1.5);

    // Verification multiplier (1.0 or 1.2)
    const verificationMultiplier = user.verifications.length > 0 ? 1.2 : 1.0;

    const finalWeight = Math.round(
      accountAgeMultiplier * 
      reputationMultiplier * 
      contributionMultiplier * 
      verificationMultiplier * 
      100
    ) / 100;

    return {
      base: 1,
      multipliers: {
        accountAge: accountAgeMultiplier,
        reputation: reputationMultiplier,
        contribution: contributionMultiplier,
        verification: verificationMultiplier
      },
      final: finalWeight
    };
  }

  // Anti-manipulation checks
  async validateVote(userId: string, ideaId: string): Promise<{ valid: boolean; reason?: string }> {
    // Check rate limiting
    const voteKey = `vote:${userId}:${ideaId}`;
    const rateLimitKey = `ratelimit:vote:${userId}`;
    
    // Check if already voted
    const existingVote = await cache.get<boolean>(voteKey);
    if (existingVote) {
      return { valid: false, reason: 'Already voted for this idea' };
    }

    // Check vote rate limit (30 votes per hour)
    const withinLimit = await rateLimiter.checkLimit(rateLimitKey, 30, 3600);
    if (!withinLimit) {
      return { valid: false, reason: 'Vote rate limit exceeded' };
    }

    // Check for vote manipulation patterns
    const recentVotes = await prisma.vote.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Pattern detection: rapid voting
    if (recentVotes.length >= 5) {
      const timeSpan = Date.now() - recentVotes[4].createdAt.getTime();
      if (timeSpan < 60000) { // 5 votes in 1 minute
        return { valid: false, reason: 'Suspicious voting pattern detected' };
      }
    }

    // Check IP-based rate limiting
    const ipKey = `vote:ip:${await this.getUserIP(userId)}`;
    const ipWithinLimit = await rateLimiter.checkLimit(ipKey, 50, 3600);
    if (!ipWithinLimit) {
      return { valid: false, reason: 'IP rate limit exceeded' };
    }

    return { valid: true };
  }

  // Process vote with integrity checks
  async processVote(userId: string, ideaId: string, ipAddress?: string): Promise<any> {
    // Validate vote
    const validation = await this.validateVote(userId, ideaId);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Calculate vote weight
    const weight = await this.calculateVoteWeight(userId);

    // Begin transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create vote record
      const vote = await tx.vote.create({
        data: {
          userId,
          ideaId,
          weight: Math.round(weight.final * 100) // Store as integer
        }
      });

      // Update idea vote count
      await tx.idea.update({
        where: { id: ideaId },
        data: {
          voteCount: {
            increment: weight.final
          }
        }
      });

      // Update user points
      await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: 5 // Points for voting
          }
        }
      });

      return vote;
    });

    // Cache the vote
    await cache.set(`vote:${userId}:${ideaId}`, true, 7 * 24 * 3600);

    // Update leaderboard
    await redis.zadd('votes:daily', Date.now(), `${userId}:${ideaId}`);

    return {
      vote: result,
      weight: weight.final
    };
  }

  // Fraud detection algorithm
  async detectVoteManipulation(votingCycleId: string): Promise<any[]> {
    const suspiciousPatterns = [];

    // Get all votes in cycle
    const votes = await prisma.vote.findMany({
      where: {
        idea: {
          votingCycleId
        }
      },
      include: {
        user: true,
        idea: true
      }
    });

    // Group votes by user
    const userVotes = new Map<string, typeof votes>();
    votes.forEach(vote => {
      const userId = vote.userId;
      if (!userVotes.has(userId)) {
        userVotes.set(userId, []);
      }
      userVotes.get(userId)!.push(vote);
    });

    // Check for suspicious patterns
    for (const [userId, userVoteList] of userVotes) {
      // Pattern 1: Voting for all ideas from same submitter
      const targetSubmitters = new Map<string, number>();
      userVoteList.forEach(vote => {
        const submitterId = vote.idea.userId;
        targetSubmitters.set(submitterId, (targetSubmitters.get(submitterId) || 0) + 1);
      });

      for (const [submitterId, count] of targetSubmitters) {
        if (count > 5 && submitterId !== userId) {
          suspiciousPatterns.push({
            type: 'COLLUSION',
            userId,
            targetId: submitterId,
            voteCount: count
          });
        }
      }

      // Pattern 2: Rapid successive voting
      const sortedVotes = userVoteList.sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      );

      for (let i = 1; i < sortedVotes.length; i++) {
        const timeDiff = sortedVotes[i].createdAt.getTime() - sortedVotes[i-1].createdAt.getTime();
        if (timeDiff < 5000) { // Less than 5 seconds between votes
          suspiciousPatterns.push({
            type: 'RAPID_VOTING',
            userId,
            timestamp: sortedVotes[i].createdAt
          });
          break;
        }
      }
    }

    return suspiciousPatterns;
  }

  private async getUserIP(userId: string): Promise<string> {
    // This would be stored during authentication
    const ipHash = createHash('sha256').update(userId).digest('hex');
    return ipHash.substring(0, 16);
  }
}

export default new VotingService();
