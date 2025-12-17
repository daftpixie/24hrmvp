"use strict";
// backend/src/routes/votes-enhanced.ts
// ENHANCED VOTING WITH VOTE CREDIT CONSUMPTION
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const index_1 = require("../index");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// ============================================
// VALIDATION SCHEMAS
// ============================================
const CastVoteSchema = zod_1.z.object({
    ideaId: zod_1.z.string(),
});
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Consume vote credits (oldest first, FIFO)
 */
async function consumeVoteCredit(userId, tx) {
    // Get available credits (ordered by creation date - use oldest first)
    const availableCredits = await tx.voteCredit.findMany({
        where: {
            userId,
            isExpired: false,
            expiresAt: {
                OR: [
                    { gt: new Date() },
                    { equals: null },
                ],
            },
        },
        orderBy: {
            createdAt: 'asc', // FIFO - use oldest first
        },
    });
    // Find first credit with remaining balance
    for (const credit of availableCredits) {
        const remaining = credit.amount - credit.consumed;
        if (remaining > 0) {
            // Consume one credit
            await tx.voteCredit.update({
                where: { id: credit.id },
                data: {
                    consumed: { increment: 1 },
                    remaining: remaining - 1,
                },
            });
            return {
                creditId: credit.id,
                source: credit.source,
            };
        }
    }
    throw new Error('No vote credits available');
}
/**
 * Get user's vote statistics for current cycle
 */
async function getUserVoteStats(userId, cycleId) {
    const votes = await index_1.prisma.vote.findMany({
        where: {
            userId,
            idea: {
                votingCycleId: cycleId,
            },
        },
        include: {
            consumption: true,
        },
    });
    const bySource = votes.reduce((acc, vote) => {
        const source = vote.consumption?.creditSource || 'FREE_DAILY';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});
    return {
        total: votes.length,
        bySource,
    };
}
// ============================================
// ENDPOINTS
// ============================================
/**
 * POST /api/votes/enhanced
 * Cast a vote for an idea (consumes vote credit)
 */
router.post('/enhanced', auth_1.verifyFarcasterAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        const validation = CastVoteSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid input data',
                details: validation.error.errors,
            });
        }
        const { ideaId } = validation.data;
        // Get or create user
        const user = await index_1.prisma.user.upsert({
            where: { fid: req.user.fid },
            update: {
                lastActiveAt: new Date(),
            },
            create: {
                fid: req.user.fid,
                username: req.user.username,
                displayName: req.user.displayName,
                pfpUrl: req.user.pfpUrl,
            },
        });
        // Award daily credits if applicable
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingDaily = await index_1.prisma.voteCredit.findFirst({
            where: {
                userId: user.id,
                source: 'FREE_DAILY',
                createdAt: {
                    gte: today,
                },
            },
        });
        if (!existingDaily) {
            const expiresAt = new Date();
            expiresAt.setHours(23, 59, 59, 999);
            await index_1.prisma.voteCredit.create({
                data: {
                    userId: user.id,
                    amount: 3,
                    remaining: 3,
                    source: 'FREE_DAILY',
                    description: 'Daily free vote credits',
                    expiresAt,
                },
            });
        }
        // Check if idea exists and is in active cycle
        const idea = await index_1.prisma.idea.findUnique({
            where: { id: ideaId },
            include: {
                votingCycle: true,
            },
        });
        if (!idea) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Idea not found',
            });
        }
        if (idea.votingCycle.status !== 'active') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Voting cycle is not active',
            });
        }
        // Check if user already voted for this idea
        const existingVote = await index_1.prisma.vote.findUnique({
            where: {
                userId_ideaId: {
                    userId: user.id,
                    ideaId,
                },
            },
        });
        if (existingVote) {
            return res.status(400).json({
                error: 'Already Voted',
                message: 'You have already voted for this idea',
            });
        }
        // Process vote in transaction
        const result = await index_1.prisma.$transaction(async (tx) => {
            // Consume vote credit
            let creditInfo;
            try {
                creditInfo = await consumeVoteCredit(user.id, tx);
            }
            catch (error) {
                throw new Error('No vote credits available. Purchase more votes or wait for daily refresh.');
            }
            // Calculate vote weight based on user reputation
            const voteWeight = Math.max(1, Math.floor(user.reputation / 100));
            // Create vote
            const vote = await tx.vote.create({
                data: {
                    userId: user.id,
                    ideaId,
                    weight: voteWeight,
                },
            });
            // Record credit consumption
            await tx.voteConsumption.create({
                data: {
                    voteId: vote.id,
                    creditId: creditInfo.creditId,
                    creditSource: creditInfo.source,
                },
            });
            // Update idea vote count
            await tx.idea.update({
                where: { id: ideaId },
                data: {
                    voteCount: { increment: 1 },
                    voteWeight: { increment: voteWeight },
                },
            });
            // Award points for voting
            await tx.pointHistory.create({
                data: {
                    userId: user.id,
                    points: 2,
                    action: 'vote_cast',
                    description: `Voted for: ${idea.title}`,
                    sourceId: ideaId,
                },
            });
            await tx.user.update({
                where: { id: user.id },
                data: {
                    points: { increment: 2 },
                },
            });
            return { vote, creditInfo };
        });
        // Get updated vote stats
        const stats = await getUserVoteStats(user.id, idea.votingCycleId);
        res.status(201).json({
            success: true,
            vote: result.vote,
            creditUsed: result.creditInfo.source,
            stats,
            message: 'Vote cast successfully! You earned 2 points.',
        });
    }
    catch (error) {
        console.error('Cast vote error:', error);
        if (error.message && error.message.includes('No vote credits')) {
            return res.status(400).json({
                error: 'Insufficient Credits',
                message: error.message,
            });
        }
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to cast vote',
        });
    }
});
/**
 * GET /api/votes/my-votes/enhanced
 * Get current user's voting history with credit tracking
 */
router.get('/my-votes/enhanced', auth_1.verifyFarcasterAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        const user = await index_1.prisma.user.findUnique({
            where: { fid: req.user.fid },
        });
        if (!user) {
            return res.json({
                success: true,
                votes: [],
                stats: {
                    total: 0,
                    bySource: {},
                    byCycle: {},
                },
            });
        }
        // Get all votes with details
        const votes = await index_1.prisma.vote.findMany({
            where: {
                userId: user.id,
            },
            include: {
                idea: {
                    include: {
                        votingCycle: {
                            select: {
                                id: true,
                                name: true,
                                status: true,
                            },
                        },
                    },
                },
                consumption: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        // Calculate statistics
        const bySource = votes.reduce((acc, vote) => {
            const source = vote.consumption?.creditSource || 'FREE_DAILY';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {});
        const byCycle = votes.reduce((acc, vote) => {
            const cycleId = vote.idea.votingCycle.id;
            acc[cycleId] = (acc[cycleId] || 0) + 1;
            return acc;
        }, {});
        res.json({
            success: true,
            votes: votes.map(v => ({
                id: v.id,
                ideaId: v.ideaId,
                ideaTitle: v.idea.title,
                voteWeight: v.weight,
                creditSource: v.consumption?.creditSource || 'FREE_DAILY',
                votingCycle: v.idea.votingCycle,
                createdAt: v.createdAt,
            })),
            stats: {
                total: votes.length,
                bySource,
                byCycle,
            },
        });
    }
    catch (error) {
        console.error('Get votes error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve votes',
        });
    }
});
/**
 * GET /api/votes/stats/:cycleId
 * Get voting statistics for a specific cycle
 */
router.get('/stats/:cycleId', async (req, res) => {
    try {
        const { cycleId } = req.params;
        const cycle = await index_1.prisma.votingCycle.findUnique({
            where: { id: cycleId },
            include: {
                ideas: {
                    include: {
                        _count: {
                            select: {
                                votes: true,
                            },
                        },
                    },
                },
            },
        });
        if (!cycle) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Voting cycle not found',
            });
        }
        // Calculate statistics
        const totalVotes = cycle.ideas.reduce((sum, idea) => sum + idea.voteCount, 0);
        const totalIdeas = cycle.ideas.length;
        const averageVotesPerIdea = totalIdeas > 0 ? totalVotes / totalIdeas : 0;
        // Get vote distribution by source
        const voteConsumptions = await index_1.prisma.voteConsumption.findMany({
            where: {
                vote: {
                    idea: {
                        votingCycleId: cycleId,
                    },
                },
            },
        });
        const votesBySource = voteConsumptions.reduce((acc, consumption) => {
            acc[consumption.creditSource] = (acc[consumption.creditSource] || 0) + 1;
            return acc;
        }, {});
        res.json({
            success: true,
            cycle: {
                id: cycle.id,
                name: cycle.name,
                status: cycle.status,
                startDate: cycle.startDate,
                endDate: cycle.endDate,
            },
            stats: {
                totalVotes,
                totalIdeas,
                averageVotesPerIdea: Math.round(averageVotesPerIdea * 100) / 100,
                votesBySource,
                topIdeas: cycle.ideas
                    .sort((a, b) => b.voteWeight - a.voteWeight)
                    .slice(0, 5)
                    .map((idea, index) => ({
                    rank: index + 1,
                    id: idea.id,
                    title: idea.title,
                    voteCount: idea.voteCount,
                    voteWeight: idea.voteWeight,
                })),
            },
        });
    }
    catch (error) {
        console.error('Get cycle stats error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve statistics',
        });
    }
});
exports.default = router;
//# sourceMappingURL=votes-enhanced.js.map