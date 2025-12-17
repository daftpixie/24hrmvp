"use strict";
// ============================================
// 24HRMVP - THE GRID RANKING SERVICE
// File: backend/src/services/ranking.ts
// Wilson Score and Hot ranking algorithms
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankingService = exports.RankingService = void 0;
const client_1 = require("../db/client");
const client_2 = require("@prisma/client");
/**
 * Ranking service implementing Wilson Score and Hot algorithms
 *
 * Wilson Score: Confidence interval for proportion of positive votes
 * - Better for sorting by quality with few votes
 * - Accounts for sample size uncertainty
 *
 * Hot Score: Time-decay algorithm (Reddit-style)
 * - Balances recency with vote score
 * - Posts decay over time unless receiving engagement
 */
class RankingService {
    // Wilson Score confidence level (95%)
    Z = 1.96;
    // Epoch for hot score calculation (Jan 1, 2024)
    EPOCH = new Date('2024-01-01').getTime() / 1000;
    // Hot score decay factor (45000 = ~12.5 hours)
    DECAY_FACTOR = 45000;
    /**
     * Calculate Wilson Score for a given upvote/downvote count
     *
     * The Wilson score interval is a way to sort by confidence in quality
     * rather than raw positive percentage. It handles cases where:
     * - A post with 1 upvote and 0 downvotes (100%) ranks lower than
     * - A post with 100 upvotes and 10 downvotes (90.9%)
     *
     * This is because we're more confident in the second score.
     *
     * @param upvotes Number of upvotes
     * @param downvotes Number of downvotes
     * @returns Wilson score (lower bound of confidence interval)
     */
    calculateWilsonScore(upvotes, downvotes) {
        const n = upvotes + downvotes;
        if (n === 0)
            return 0;
        const z = this.Z;
        const phat = upvotes / n;
        // Wilson score interval lower bound
        const numerator = phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);
        const denominator = 1 + (z * z) / n;
        return numerator / denominator;
    }
    /**
     * Calculate Hot Score for time-based ranking
     *
     * Based on Reddit's algorithm:
     * - Log of absolute score (gives diminishing returns to high-scoring posts)
     * - Sign of score (net positive or negative)
     * - Time component (seconds since epoch / decay factor)
     *
     * @param score Net score (upvotes - downvotes)
     * @param createdAt Post creation timestamp
     * @returns Hot score (higher = more prominent in feed)
     */
    calculateHotScore(score, createdAt) {
        const order = Math.log10(Math.max(Math.abs(score), 1));
        const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
        const seconds = createdAt.getTime() / 1000 - this.EPOCH;
        return sign * order + seconds / this.DECAY_FACTOR;
    }
    /**
     * Calculate Controversy Score
     *
     * Posts are controversial when they have:
     * - High total engagement (lots of votes)
     * - Close to 50/50 split between up and down
     *
     * @param upvotes Number of upvotes
     * @param downvotes Number of downvotes
     * @returns Controversy score (higher = more controversial)
     */
    calculateControversyScore(upvotes, downvotes) {
        if (upvotes <= 0 || downvotes <= 0)
            return 0;
        const total = upvotes + downvotes;
        const magnitude = Math.pow(total, 0.8);
        // Balance: how close to 50/50 (1.0 = perfect split)
        const balance = 1 - Math.abs(upvotes - downvotes) / total;
        return magnitude * balance;
    }
    /**
     * Update all ranking metrics for a post
     *
     * @param postId The post ID to update
     * @returns Updated ranking metrics
     */
    async updatePostRanking(postId) {
        const post = await client_1.prisma.forumPost.findUnique({
            where: { id: postId },
            select: {
                upvotes: true,
                downvotes: true,
                createdAt: true,
            },
        });
        if (!post) {
            throw new Error('Post not found');
        }
        const wilsonScore = this.calculateWilsonScore(post.upvotes, post.downvotes);
        const hotScore = this.calculateHotScore(post.upvotes - post.downvotes, post.createdAt);
        const controversyScore = this.calculateControversyScore(post.upvotes, post.downvotes);
        await client_1.prisma.forumPost.update({
            where: { id: postId },
            data: {
                wilsonScore,
                hotScore,
                // Note: controversy score is calculated on-demand, not stored
            },
        });
        return {
            wilsonScore,
            hotScore,
            controversyScore,
        };
    }
    /**
     * Recalculate rankings for all posts
     * Useful for periodic maintenance or algorithm changes
     *
     * @returns Number of posts updated
     */
    async recalculateAllRankings() {
        // Get all approved, non-deleted posts
        // Using moderationStatus instead of isDeleted field
        const posts = await client_1.prisma.forumPost.findMany({
            where: {
                moderationStatus: client_2.ModerationStatus.APPROVED, // UPPERCASE
            },
            select: {
                id: true,
                upvotes: true,
                downvotes: true,
                createdAt: true,
            },
        });
        let updatedCount = 0;
        // Batch updates for efficiency
        const batchSize = 100;
        for (let i = 0; i < posts.length; i += batchSize) {
            const batch = posts.slice(i, i + batchSize);
            await Promise.all(batch.map(async (post) => {
                const wilsonScore = this.calculateWilsonScore(post.upvotes, post.downvotes);
                const hotScore = this.calculateHotScore(post.upvotes - post.downvotes, post.createdAt);
                await client_1.prisma.forumPost.update({
                    where: { id: post.id },
                    data: { wilsonScore, hotScore },
                });
            }));
            updatedCount += batch.length;
        }
        return updatedCount;
    }
    /**
     * Get top posts by Wilson Score for a given timeframe
     */
    async getTopByWilson(limit = 10, daysBack = 7) {
        const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
        const posts = await client_1.prisma.forumPost.findMany({
            where: {
                createdAt: { gte: since },
                moderationStatus: client_2.ModerationStatus.APPROVED, // UPPERCASE
            },
            orderBy: { wilsonScore: 'desc' },
            take: limit,
            select: { id: true },
        });
        return posts.map((p) => p.id);
    }
    /**
     * Get hot posts (combines recency and score)
     */
    async getHotPosts(limit = 10) {
        const posts = await client_1.prisma.forumPost.findMany({
            where: {
                moderationStatus: client_2.ModerationStatus.APPROVED, // UPPERCASE
            },
            orderBy: { hotScore: 'desc' },
            take: limit,
            select: { id: true },
        });
        return posts.map((p) => p.id);
    }
    /**
     * Get controversial posts
     */
    async getControversialPosts(limit = 10, daysBack = 7) {
        const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
        // Fetch posts and calculate controversy score
        const posts = await client_1.prisma.forumPost.findMany({
            where: {
                createdAt: { gte: since },
                moderationStatus: client_2.ModerationStatus.APPROVED, // UPPERCASE
                // Only consider posts with some engagement
                AND: [
                    { upvotes: { gt: 0 } },
                    { downvotes: { gt: 0 } },
                ],
            },
            select: {
                id: true,
                upvotes: true,
                downvotes: true,
            },
        });
        // Sort by controversy score
        const sorted = posts
            .map((p) => ({
            id: p.id,
            controversy: this.calculateControversyScore(p.upvotes, p.downvotes),
        }))
            .sort((a, b) => b.controversy - a.controversy)
            .slice(0, limit);
        return sorted.map((p) => p.id);
    }
}
exports.RankingService = RankingService;
// Export singleton instance
exports.rankingService = new RankingService();
exports.default = exports.rankingService;
//# sourceMappingURL=ranking.js.map