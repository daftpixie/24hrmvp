// ============================================
// 24HRMVP - THE GRID MODERATION SERVICE
// File: backend/src/services/moderation.ts
// AI-powered content moderation with OpenAI
// ============================================

import { prisma } from '../db/client';
import { ModerationStatus, ModerationEntityType } from '@prisma/client';
import {
  IModerationService,
  AIModerationResult,
  ModerationResult,
  ModerationQueueDTO,
  ModerationDecisionDTO,
  ModerationQueueParams,
} from '../types/grid';

// OpenAI client (dynamic import to handle missing key gracefully)
let openai: any = null;

async function getOpenAI() {
  if (openai) return openai;
  
  try {
    const OpenAI = (await import('openai')).default;
    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  } catch (error) {
    console.warn('OpenAI SDK not available:', error);
  }
  
  return openai;
}

/**
 * Content moderation service with AI-powered analysis
 * 
 * Uses OpenAI's Moderation API (free) for initial screening,
 * then queues flagged content for human review.
 */
export class ModerationService implements IModerationService {
  // Thresholds for auto-flagging (can be adjusted)
  private readonly AUTO_FLAG_THRESHOLD = 0.7;
  private readonly AUTO_APPROVE_THRESHOLD = 0.3;

  /**
   * Moderate content using OpenAI's Moderation API
   * 
   * @param content Text content to moderate
   * @returns AI moderation result with category scores
   */
  async moderateContent(content: string): Promise<AIModerationResult> {
    const client = await getOpenAI();
    
    if (!client) {
      // Return safe default if OpenAI not configured
      console.warn('OpenAI not configured, skipping AI moderation');
      return {
        flagged: false,
        score: 0,
        categories: {
          hate: false,
          harassment: false,
          'self-harm': false,
          sexual: false,
          violence: false,
          'hate/threatening': false,
          'harassment/threatening': false,
          'self-harm/intent': false,
          'self-harm/instructions': false,
          'sexual/minors': false,
          'violence/graphic': false,
        },
        categoryScores: {},
      };
    }

    try {
      const response = await client.moderations.create({
        input: content,
        model: 'omni-moderation-latest',
      });

      const result = response.results[0];
      
      // Calculate max score across all categories
      const maxScore = Math.max(...(Object.values(result.category_scores) as number[]));

      return {
        flagged: result.flagged,
        score: maxScore,
        categories: result.categories,
        categoryScores: result.category_scores,
      };
    } catch (error) {
      console.error('OpenAI moderation error:', error);
      // Return safe default on error
      return {
        flagged: false,
        score: 0,
        categories: {
          hate: false,
          harassment: false,
          'self-harm': false,
          sexual: false,
          violence: false,
          'hate/threatening': false,
          'harassment/threatening': false,
          'self-harm/intent': false,
          'self-harm/instructions': false,
          'sexual/minors': false,
          'violence/graphic': false,
        },
        categoryScores: {},
      };
    }
  }

  /**
   * Check content and add to moderation queue if needed
   * 
   * @param entityType Type of entity being moderated
   * @param entityId ID of the entity
   * @param content Text content to check
   * @returns Moderation result with action taken
   */
  async checkAndQueue(
    entityType: ModerationEntityType,
    entityId: string,
    content: string
  ): Promise<ModerationResult> {
    const aiResult = await this.moderateContent(content);

    // Auto-approve if score is very low
    if (aiResult.score < this.AUTO_APPROVE_THRESHOLD && !aiResult.flagged) {
      return {
        approved: true,
        action: ModerationStatus.APPROVED, // UPPERCASE
        aiResult,
      };
    }

    // Queue for review if flagged or score is high
    const queueItem = await prisma.moderationQueue.create({
      data: {
        entityType,
        entityId,
        aiScore: aiResult.score,
        aiCategories: aiResult.categories as any,
        aiReason: this.getAIReason(aiResult),
        action: aiResult.flagged 
          ? ModerationStatus.FLAGGED  // UPPERCASE
          : ModerationStatus.PENDING, // UPPERCASE
      },
    });

    // If score is very high, auto-reject
    if (aiResult.score >= this.AUTO_FLAG_THRESHOLD || aiResult.flagged) {
      return {
        approved: false,
        action: ModerationStatus.FLAGGED, // UPPERCASE
        reason: this.getAIReason(aiResult),
        aiResult,
        queueId: queueItem.id,
      };
    }

    // Pending review
    return {
      approved: true, // Allow but queue for review
      action: ModerationStatus.PENDING, // UPPERCASE
      aiResult,
      queueId: queueItem.id,
    };
  }

  /**
   * Get moderation queue with filtering
   */
  async getQueue(params: ModerationQueueParams): Promise<{ items: ModerationQueueDTO[]; total: number }> {
    const { status, entityType, page = 1, limit = 20 } = params;

    const where: any = {};
    
    if (status) {
      where.action = status;
    }
    
    if (entityType) {
      where.entityType = entityType;
    }

    const [items, total] = await Promise.all([
      prisma.moderationQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reviewedBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.moderationQueue.count({ where }),
    ]);

    // Fetch associated entities
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        let entity: any = null;

        switch (item.entityType) {
          case ModerationEntityType.FORUM_POST:
            entity = await prisma.forumPost.findUnique({
              where: { id: item.entityId },
              select: {
                id: true,
                title: true,
                content: true,
                author: {
                  select: {
                    username: true,
                    displayName: true,
                  },
                },
              },
            });
            break;
          case ModerationEntityType.SOCIAL_POST:
            entity = await prisma.socialPost.findUnique({
              where: { id: item.entityId },
              select: {
                id: true,
                content: true,
                authorUsername: true,
              },
            });
            break;
          // Add more entity types as needed
        }

        return {
          ...item,
          entity,
          aiCategories: item.aiCategories as AIModerationResult['categories'] | null,
          reviewer: item.reviewedBy,
        };
      })
    );

    return { items: enrichedItems, total };
  }

  /**
   * Get a single queue item by ID
   */
  async getQueueItem(id: string): Promise<ModerationQueueDTO | null> {
    const item = await prisma.moderationQueue.findUnique({
      where: { id },
      include: {
        reviewedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!item) return null;

    // Fetch associated entity
    let entity: any = null;

    switch (item.entityType) {
      case ModerationEntityType.FORUM_POST:
        entity = await prisma.forumPost.findUnique({
          where: { id: item.entityId },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
        break;
      case ModerationEntityType.SOCIAL_POST:
        entity = await prisma.socialPost.findUnique({
          where: { id: item.entityId },
        });
        break;
    }

    return {
      ...item,
      entity,
      aiCategories: item.aiCategories as AIModerationResult['categories'] | null,
      reviewer: item.reviewedBy,
    };
  }

  /**
   * Review a moderation queue item
   */
  async review(
    id: string,
    reviewerId: string,
    decision: ModerationDecisionDTO
  ): Promise<ModerationQueueDTO> {
    const item = await prisma.moderationQueue.update({
      where: { id },
      data: {
        action: decision.action, // Already UPPERCASE from type
        reviewedById: reviewerId,
        reviewNotes: decision.notes,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // Apply decision to the entity
    await this.applyDecision(item.entityType, item.entityId, decision.action);

    return {
      ...item,
      aiCategories: item.aiCategories as AIModerationResult['categories'] | null,
      reviewer: item.reviewedBy,
    };
  }

  /**
   * Report content for moderation
   */
  async reportContent(
    entityType: ModerationEntityType,
    entityId: string,
    reporterId: string,
    reason: string
  ): Promise<void> {
    // Check if already in queue
    const existing = await prisma.moderationQueue.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });

    if (existing) {
      // Increment report count
      await prisma.moderationQueue.update({
        where: { id: existing.id },
        data: {
          reportCount: { increment: 1 },
          reportReason: reason, // Update with latest reason
          reportedBy: reporterId,
          // Escalate if multiple reports
          action: existing.reportCount >= 2 
            ? ModerationStatus.ESCALATED // UPPERCASE 
            : existing.action,
        },
      });
    } else {
      // Create new queue item
      await prisma.moderationQueue.create({
        data: {
          entityType,
          entityId,
          action: ModerationStatus.PENDING, // UPPERCASE
          reportedBy: reporterId,
          reportReason: reason,
          reportCount: 1,
        },
      });
    }
  }

  /**
   * Apply moderation decision to entity
   */
  private async applyDecision(
    entityType: ModerationEntityType,
    entityId: string,
    action: ModerationStatus
  ): Promise<void> {
    switch (entityType) {
      case ModerationEntityType.FORUM_POST:
        await prisma.forumPost.update({
          where: { id: entityId },
          data: { moderationStatus: action },
        });
        break;
      case ModerationEntityType.SOCIAL_POST:
        if (action === ModerationStatus.REJECTED) { // UPPERCASE
          await prisma.socialPost.update({
            where: { id: entityId },
            data: { isHidden: true },
          });
        }
        break;
      case ModerationEntityType.USER:
        if (action === ModerationStatus.REJECTED) { // UPPERCASE
          await prisma.user.update({
            where: { id: entityId },
            data: { isBanned: true },
          });
        }
        break;
      // Add more entity types as needed
    }
  }

  /**
   * Generate human-readable reason from AI result
   */
  private getAIReason(result: AIModerationResult): string {
    const flaggedCategories = Object.entries(result.categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => category);

    if (flaggedCategories.length === 0) {
      return 'Content flagged for review';
    }

    return `Potentially contains: ${flaggedCategories.join(', ')}`;
  }

  /**
   * Get moderation statistics
   */
  async getStats(): Promise<{
    pending: number;
    flagged: number;
    approved: number;
    rejected: number;
    escalated: number;
  }> {
    const [pending, flagged, approved, rejected, escalated] = await Promise.all([
      prisma.moderationQueue.count({ where: { action: ModerationStatus.PENDING } }),   // UPPERCASE
      prisma.moderationQueue.count({ where: { action: ModerationStatus.FLAGGED } }),   // UPPERCASE
      prisma.moderationQueue.count({ where: { action: ModerationStatus.APPROVED } }),  // UPPERCASE
      prisma.moderationQueue.count({ where: { action: ModerationStatus.REJECTED } }),  // UPPERCASE
      prisma.moderationQueue.count({ where: { action: ModerationStatus.ESCALATED } }), // UPPERCASE
    ]);

    return { pending, flagged, approved, rejected, escalated };
  }
}

// Export singleton instance
export const moderationService = new ModerationService();
export default moderationService;

