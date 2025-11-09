import { prisma } from '../db/client';
import { emitToRoom } from '../services/websocket';

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  condition: (user: any, context?: any) => Promise<boolean>;
}

export class AchievementService {
  private achievements: Map<string, AchievementDefinition> = new Map();

  constructor() {
    this.registerAchievements();
  }

  private registerAchievements() {
    // Define all achievements
    const achievementList: AchievementDefinition[] = [
      {
        id: 'first_idea',
        name: 'First Steps',
        description: 'Submit your first idea',
        icon: '🚀',
        points: 50,
        tier: 'bronze',
        condition: async (user) => user._count.ideas === 1
      },
      {
        id: 'idea_master',
        name: 'Idea Master',
        description: 'Submit 10 ideas',
        icon: '💡',
        points: 200,
        tier: 'silver',
        condition: async (user) => user._count.ideas >= 10
      },
      {
        id: 'week_streak',
        name: '7 Day Streak',
        description: 'Active for 7 consecutive days',
        icon: '🔥',
        points: 100,
        tier: 'bronze',
        condition: async (user, context) => context?.streak >= 7
      },
      {
        id: 'month_streak',
        name: '30 Day Legend',
        description: 'Active for 30 consecutive days',
        icon: '⚡',
        points: 500,
        tier: 'gold',
        condition: async (user, context) => context?.streak >= 30
      },
      {
        id: 'viral_idea',
        name: 'Viral Sensation',
        description: 'Get 100+ votes on an idea',
        icon: '🌟',
        points: 300,
        tier: 'silver',
        condition: async (user, context) => context?.topVotes >= 100
      },
      {
        id: 'mvp_winner',
        name: 'MVP Champion',
        description: 'Win a voting cycle',
        icon: '🏆',
        points: 1000,
        tier: 'platinum',
        condition: async (user, context) => context?.wonCycle === true
      },
      {
        id: 'top_voter',
        name: 'Democracy Champion',
        description: 'Cast 100 votes',
        icon: '🗳️',
        points: 150,
        tier: 'bronze',
        condition: async (user) => user._count.votes >= 100
      },
      {
        id: 'early_adopter',
        name: 'Early Adopter',
        description: 'Join in the first month',
        icon: '🌅',
        points: 200,
        tier: 'silver',
        condition: async (user) => {
          const launchDate = new Date('2024-01-01');
          const joinDate = new Date(user.createdAt);
          const monthLater = new Date(launchDate);
          monthLater.setMonth(monthLater.getMonth() + 1);
          return joinDate <= monthLater;
        }
      }
    ];

    achievementList.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  async checkAchievements(userId: string, action: string, context?: any): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true,
        _count: {
          select: { ideas: true, votes: true }
        }
      }
    });

    if (!user) return [];

    const earnedAchievementIds = user.achievements.map(a => a.type);
    const newAchievements: string[] = [];

    for (const [id, achievement] of this.achievements) {
      // Skip if already earned
      if (earnedAchievementIds.includes(id)) continue;

      // Check if condition is met
      const conditionMet = await achievement.condition(user, context);
      
      if (conditionMet) {
        // Award achievement
        await this.awardAchievement(userId, achievement);
        newAchievements.push(id);
      }
    }

    return newAchievements;
  }

  private async awardAchievement(userId: string, achievement: AchievementDefinition) {
    await prisma.$transaction(async (tx) => {
      // Create achievement record
      await tx.achievement.create({
        data: {
          userId,
          type: achievement.id,
          name: achievement.name,
          description: achievement.description
        }
      });

      // Award points
      await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: achievement.points
          }
        }
      });
    });

    // Send notification
    emitToRoom(`user:${userId}`, 'achievement:earned', {
      achievement: {
        id: achievement.id,
        name: achievement.name,
        icon: achievement.icon,
        points: achievement.points
      }
    });
  }

  async getUserProgress(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true,
        _count: {
          select: { ideas: true, votes: true }
        }
      }
    });

    if (!user) return null;

    const earnedIds = user.achievements.map(a => a.type);
    const allAchievements = Array.from(this.achievements.values());

    return {
      earned: allAchievements.filter(a => earnedIds.includes(a.id)),
      available: allAchievements.filter(a => !earnedIds.includes(a.id)),
      totalPoints: user.points,
      stats: {
        ideas: user._count.ideas,
        votes: user._count.votes,
        achievementsEarned: earnedIds.length,
        achievementsTotal: allAchievements.length
      }
    };
  }
}

export default new AchievementService();
