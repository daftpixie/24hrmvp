"use strict";
// ============================================
// 24HRMVP - THE GRID MODERATION SERVICE
// File: backend/src/services/moderation.ts
// AI-powered content moderation with OpenAI
// ============================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderationService = exports.ModerationService = void 0;
const client_1 = require("../db/client");
const client_2 = require("@prisma/client");
// OpenAI client (dynamic import to handle missing key gracefully)
let openai = null;
async function getOpenAI() {
    if (openai)
        return openai;
    try {
        const OpenAI = (await Promise.resolve().then(() => __importStar(require('openai')))).default;
        if (process.env.OPENAI_API_KEY) {
            openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
    }
    catch (error) {
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
class ModerationService {
    // Thresholds for auto-flagging (can be adjusted)
    AUTO_FLAG_THRESHOLD = 0.7;
    AUTO_APPROVE_THRESHOLD = 0.3;
    /**
     * Moderate content using OpenAI's Moderation API
     *
     * @param content Text content to moderate
     * @returns AI moderation result with category scores
     */
    async moderateContent(content) {
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
            const maxScore = Math.max(...Object.values(result.category_scores));
            return {
                flagged: result.flagged,
                score: maxScore,
                categories: result.categories,
                categoryScores: result.category_scores,
            };
        }
        catch (error) {
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
    async checkAndQueue(entityType, entityId, content) {
        const aiResult = await this.moderateContent(content);
        // Auto-approve if score is very low
        if (aiResult.score < this.AUTO_APPROVE_THRESHOLD && !aiResult.flagged) {
            return {
                approved: true,
                action: client_2.ModerationStatus.APPROVED, // UPPERCASE
                aiResult,
            };
        }
        // Queue for review if flagged or score is high
        const queueItem = await client_1.prisma.moderationQueue.create({
            data: {
                entityType,
                entityId,
                aiScore: aiResult.score,
                aiCategories: aiResult.categories,
                aiReason: this.getAIReason(aiResult),
                action: aiResult.flagged
                    ? client_2.ModerationStatus.FLAGGED // UPPERCASE
                    : client_2.ModerationStatus.PENDING, // UPPERCASE
            },
        });
        // If score is very high, auto-reject
        if (aiResult.score >= this.AUTO_FLAG_THRESHOLD || aiResult.flagged) {
            return {
                approved: false,
                action: client_2.ModerationStatus.FLAGGED, // UPPERCASE
                reason: this.getAIReason(aiResult),
                aiResult,
                queueId: queueItem.id,
            };
        }
        // Pending review
        return {
            approved: true, // Allow but queue for review
            action: client_2.ModerationStatus.PENDING, // UPPERCASE
            aiResult,
            queueId: queueItem.id,
        };
    }
    /**
     * Get moderation queue with filtering
     */
    async getQueue(params) {
        const { status, entityType, page = 1, limit = 20 } = params;
        const where = {};
        if (status) {
            where.action = status;
        }
        if (entityType) {
            where.entityType = entityType;
        }
        const [items, total] = await Promise.all([
            client_1.prisma.moderationQueue.findMany({
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
            client_1.prisma.moderationQueue.count({ where }),
        ]);
        // Fetch associated entities
        const enrichedItems = await Promise.all(items.map(async (item) => {
            let entity = null;
            switch (item.entityType) {
                case client_2.ModerationEntityType.FORUM_POST:
                    entity = await client_1.prisma.forumPost.findUnique({
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
                case client_2.ModerationEntityType.SOCIAL_POST:
                    entity = await client_1.prisma.socialPost.findUnique({
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
                aiCategories: item.aiCategories,
                reviewer: item.reviewedBy,
            };
        }));
        return { items: enrichedItems, total };
    }
    /**
     * Get a single queue item by ID
     */
    async getQueueItem(id) {
        const item = await client_1.prisma.moderationQueue.findUnique({
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
        if (!item)
            return null;
        // Fetch associated entity
        let entity = null;
        switch (item.entityType) {
            case client_2.ModerationEntityType.FORUM_POST:
                entity = await client_1.prisma.forumPost.findUnique({
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
            case client_2.ModerationEntityType.SOCIAL_POST:
                entity = await client_1.prisma.socialPost.findUnique({
                    where: { id: item.entityId },
                });
                break;
        }
        return {
            ...item,
            entity,
            aiCategories: item.aiCategories,
            reviewer: item.reviewedBy,
        };
    }
    /**
     * Review a moderation queue item
     */
    async review(id, reviewerId, decision) {
        const item = await client_1.prisma.moderationQueue.update({
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
            aiCategories: item.aiCategories,
            reviewer: item.reviewedBy,
        };
    }
    /**
     * Report content for moderation
     */
    async reportContent(entityType, entityId, reporterId, reason) {
        // Check if already in queue
        const existing = await client_1.prisma.moderationQueue.findUnique({
            where: { entityType_entityId: { entityType, entityId } },
        });
        if (existing) {
            // Increment report count
            await client_1.prisma.moderationQueue.update({
                where: { id: existing.id },
                data: {
                    reportCount: { increment: 1 },
                    reportReason: reason, // Update with latest reason
                    reportedBy: reporterId,
                    // Escalate if multiple reports
                    action: existing.reportCount >= 2
                        ? client_2.ModerationStatus.ESCALATED // UPPERCASE 
                        : existing.action,
                },
            });
        }
        else {
            // Create new queue item
            await client_1.prisma.moderationQueue.create({
                data: {
                    entityType,
                    entityId,
                    action: client_2.ModerationStatus.PENDING, // UPPERCASE
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
    async applyDecision(entityType, entityId, action) {
        switch (entityType) {
            case client_2.ModerationEntityType.FORUM_POST:
                await client_1.prisma.forumPost.update({
                    where: { id: entityId },
                    data: { moderationStatus: action },
                });
                break;
            case client_2.ModerationEntityType.SOCIAL_POST:
                if (action === client_2.ModerationStatus.REJECTED) { // UPPERCASE
                    await client_1.prisma.socialPost.update({
                        where: { id: entityId },
                        data: { isHidden: true },
                    });
                }
                break;
            case client_2.ModerationEntityType.USER:
                if (action === client_2.ModerationStatus.REJECTED) { // UPPERCASE
                    await client_1.prisma.user.update({
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
    getAIReason(result) {
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
    async getStats() {
        const [pending, flagged, approved, rejected, escalated] = await Promise.all([
            client_1.prisma.moderationQueue.count({ where: { action: client_2.ModerationStatus.PENDING } }), // UPPERCASE
            client_1.prisma.moderationQueue.count({ where: { action: client_2.ModerationStatus.FLAGGED } }), // UPPERCASE
            client_1.prisma.moderationQueue.count({ where: { action: client_2.ModerationStatus.APPROVED } }), // UPPERCASE
            client_1.prisma.moderationQueue.count({ where: { action: client_2.ModerationStatus.REJECTED } }), // UPPERCASE
            client_1.prisma.moderationQueue.count({ where: { action: client_2.ModerationStatus.ESCALATED } }), // UPPERCASE
        ]);
        return { pending, flagged, approved, rejected, escalated };
    }
}
exports.ModerationService = ModerationService;
// Export singleton instance
exports.moderationService = new ModerationService();
exports.default = exports.moderationService;
//# sourceMappingURL=moderation.js.map