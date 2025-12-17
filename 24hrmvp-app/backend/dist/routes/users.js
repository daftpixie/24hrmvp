"use strict";
// ============================================
// 24HRMVP - USER PROFILE API ROUTES
// File: backend/src/routes/users.ts
// User profile endpoints
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// ============================================
// VALIDATION SCHEMAS
// ============================================
const updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().max(50).optional(),
    bio: zod_1.z.string().max(500).optional(),
    pfpUrl: zod_1.z.string().url().optional(),
});
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Build user stats from related data
 */
async function getUserStats(userId) {
    const [ideasSubmitted, ideasWon, votesGiven, votesReceived, commentsCount, forumPosts, chatMessages, streamsHosted, achievementCount,] = await Promise.all([
        // Ideas submitted
        prisma.idea.count({ where: { userId } }),
        // Ideas won (winner of voting cycle)
        prisma.idea.count({
            where: {
                userId,
                wonCycle: { isNot: null }
            }
        }),
        // Votes given
        prisma.vote.count({ where: { userId } }),
        // Votes received on user's ideas
        prisma.vote.count({
            where: {
                idea: { userId }
            }
        }),
        // Comments count
        prisma.comment.count({ where: { authorId: userId } }),
        // Forum posts
        prisma.forumPost.count({ where: { authorId: userId } }),
        // Chat messages
        prisma.chatMessage.count({ where: { authorId: userId } }),
        // Streams hosted
        prisma.livestream.count({ where: { hostId: userId } }),
        // Achievement count
        prisma.achievement.count({ where: { userId } }),
    ]);
    return {
        ideasSubmitted,
        ideasWon,
        votesGiven,
        votesReceived,
        commentsCount,
        forumPosts,
        chatMessages,
        streamsHosted,
        achievementCount,
    };
}
/**
 * Format user profile response
 */
function formatUserProfile(user, stats) {
    return {
        id: user.id,
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        pfpUrl: user.pfpUrl,
        bio: user.bio,
        custodyAddress: user.custodyAddress,
        primaryWalletAddress: user.primaryWalletAddress,
        primaryAuthProvider: user.primaryAuthProvider,
        membershipTier: user.membershipTier,
        points: user.points,
        reputation: user.reputation,
        level: user.level,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt.toISOString(),
        lastActiveAt: user.lastActiveAt.toISOString(),
        stats,
        streak: user.streak ? {
            currentStreak: user.streak.currentStreak,
            longestStreak: user.streak.longestStreak,
            lastActivityDate: user.streak.lastActivityAt?.toISOString() || null,
        } : null,
        achievements: user.achievements?.map((a) => ({
            id: a.id,
            type: a.type,
            name: a.name,
            description: a.description,
            iconUrl: a.iconUrl,
            rarity: a.rarity?.toUpperCase() || 'COMMON',
            earnedAt: a.earnedAt.toISOString(),
        })) || [],
        wallets: user.cryptoWallets?.map((w) => ({
            id: w.id,
            address: w.address,
            chainType: w.chainType,
            chainId: w.chainId,
            isPrimary: w.isPrimary,
            label: w.label,
        })) || [],
    };
}
// ============================================
// GET /api/users/:userId - Get user profile
// ============================================
router.get('/:userId', (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    // Try to find user by ID, username, or FID
    let whereClause;
    // Check if it's a numeric FID
    const maybeFid = parseInt(userId);
    if (!isNaN(maybeFid)) {
        whereClause = {
            OR: [
                { id: userId },
                { fid: maybeFid },
                { username: userId },
            ]
        };
    }
    else {
        whereClause = {
            OR: [
                { id: userId },
                { username: userId },
            ]
        };
    }
    const user = await prisma.user.findFirst({
        where: whereClause,
        include: {
            streak: true,
            achievements: {
                orderBy: { earnedAt: 'desc' },
                take: 20,
            },
            cryptoWallets: {
                orderBy: { isPrimary: 'desc' },
            },
        },
    });
    if (!user) {
        res.status(404).json({
            success: false,
            message: 'User not found',
        });
        return;
    }
    // Check if user is banned (hide from public)
    if (user.isBanned) {
        res.status(404).json({
            success: false,
            message: 'User not found',
        });
        return;
    }
    // Get user stats
    const stats = await getUserStats(user.id);
    // Format and return
    res.json({
        success: true,
        user: formatUserProfile(user, stats),
    });
}));
// ============================================
// GET /api/users/:userId/ideas - Get user's ideas
// ============================================
router.get('/:userId/ideas', (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const { limit = '10', offset = '0', status } = req.query;
    // Find user
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { id: userId },
                { username: userId },
            ]
        },
        select: { id: true, isBanned: true },
    });
    if (!user || user.isBanned) {
        res.status(404).json({
            success: false,
            message: 'User not found',
        });
        return;
    }
    // Build where clause
    const whereClause = {
        userId: user.id,
        ...(status && { status: status }),
    };
    // Fetch ideas with pagination
    const [ideas, total] = await Promise.all([
        prisma.idea.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
            include: {
                votingCycle: {
                    select: {
                        name: true,
                        status: true,
                    },
                },
                _count: {
                    select: {
                        votes: true,
                        comments: true,
                    },
                },
            },
        }),
        prisma.idea.count({ where: whereClause }),
    ]);
    res.json({
        success: true,
        ideas: ideas.map(idea => ({
            id: idea.id,
            title: idea.title,
            description: idea.description,
            category: idea.category,
            complexity: idea.complexity,
            status: idea.status,
            voteCount: idea.voteCount,
            commentCount: idea._count.comments,
            createdAt: idea.createdAt.toISOString(),
            votingCycle: idea.votingCycle,
        })),
        total,
        hasMore: parseInt(offset) + ideas.length < total,
    });
}));
// ============================================
// GET /api/users/:userId/activity - Get user activity
// ============================================
router.get('/:userId/activity', (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const { limit = '20' } = req.query;
    // Find user
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { id: userId },
                { username: userId },
            ]
        },
        select: { id: true, isBanned: true },
    });
    if (!user || user.isBanned) {
        res.status(404).json({
            success: false,
            message: 'User not found',
        });
        return;
    }
    const limitNum = parseInt(limit);
    // Fetch recent activities from multiple sources
    const [ideas, votes, comments, forumPosts, achievements] = await Promise.all([
        // Recent ideas
        prisma.idea.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                createdAt: true,
                status: true,
            },
        }),
        // Recent votes
        prisma.vote.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                idea: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        }),
        // Recent comments
        prisma.comment.findMany({
            where: { authorId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                idea: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        }),
        // Recent forum posts
        prisma.forumPost.findMany({
            where: { authorId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                slug: true,
                createdAt: true,
            },
        }),
        // Recent achievements
        prisma.achievement.findMany({
            where: { userId: user.id },
            orderBy: { earnedAt: 'desc' },
            take: 5,
            select: {
                id: true,
                name: true,
                description: true,
                earnedAt: true,
            },
        }),
    ]);
    // Combine and sort activities
    const activities = [
        ...ideas.map(i => ({
            id: `idea-${i.id}`,
            type: 'idea',
            title: `Submitted "${i.title}"`,
            description: `Status: ${i.status}`,
            timestamp: i.createdAt.toISOString(),
            metadata: { ideaId: i.id },
        })),
        ...votes.map(v => ({
            id: `vote-${v.id}`,
            type: 'vote',
            title: `Voted on "${v.idea.title}"`,
            description: `Weight: ${v.weight}`,
            timestamp: v.createdAt.toISOString(),
            metadata: { ideaId: v.idea.id },
        })),
        ...comments.map(c => ({
            id: `comment-${c.id}`,
            type: 'comment',
            title: `Commented on "${c.idea.title}"`,
            description: c.content.slice(0, 100) + (c.content.length > 100 ? '...' : ''),
            timestamp: c.createdAt.toISOString(),
            metadata: { ideaId: c.idea.id },
        })),
        ...forumPosts.map(p => ({
            id: `forum-${p.id}`,
            type: 'forum_post',
            title: `Posted "${p.title}"`,
            description: 'In the community forum',
            timestamp: p.createdAt.toISOString(),
            metadata: { slug: p.slug },
        })),
        ...achievements.map(a => ({
            id: `achievement-${a.id}`,
            type: 'achievement',
            title: `Earned "${a.name}"`,
            description: a.description,
            timestamp: a.earnedAt.toISOString(),
        })),
    ];
    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({
        success: true,
        activities: activities.slice(0, limitNum),
    });
}));
// ============================================
// GET /api/users/:userId/achievements - Get user achievements
// ============================================
router.get('/:userId/achievements', (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    // Find user
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { id: userId },
                { username: userId },
            ]
        },
        select: { id: true, isBanned: true },
    });
    if (!user || user.isBanned) {
        res.status(404).json({
            success: false,
            message: 'User not found',
        });
        return;
    }
    // Fetch all achievements
    const achievements = await prisma.achievement.findMany({
        where: { userId: user.id },
        orderBy: { earnedAt: 'desc' },
    });
    // Also fetch badge-based achievements
    const userAchievements = await prisma.userAchievement.findMany({
        where: {
            userId: user.id,
            isCompleted: true,
        },
        include: {
            badge: true,
        },
        orderBy: { completedAt: 'desc' },
    });
    // Combine both types
    const allAchievements = [
        ...achievements.map(a => ({
            id: a.id,
            type: a.type,
            name: a.name,
            description: a.description,
            iconUrl: a.iconUrl,
            rarity: a.rarity.toUpperCase(),
            earnedAt: a.earnedAt.toISOString(),
        })),
        ...userAchievements.map(ua => ({
            id: ua.id,
            type: ua.badge.category,
            name: ua.badge.name,
            description: ua.badge.description,
            iconUrl: ua.badge.iconUrl,
            rarity: ua.badge.rarity,
            earnedAt: ua.completedAt?.toISOString() || ua.createdAt.toISOString(),
        })),
    ];
    res.json({
        success: true,
        achievements: allAchievements,
    });
}));
// ============================================
// PATCH /api/users/me - Update own profile
// ============================================
router.patch('/me', (0, express_async_handler_1.default)(async (req, res) => {
    // Get authenticated user from request (set by auth middleware)
    const authUser = req.user;
    if (!authUser?.id) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
        return;
    }
    // Validate input
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
        res.status(400).json({
            success: false,
            message: 'Invalid input',
            errors: validation.error.errors,
        });
        return;
    }
    const { displayName, bio, pfpUrl } = validation.data;
    // Update user
    const updatedUser = await prisma.user.update({
        where: { id: authUser.id },
        data: {
            ...(displayName !== undefined && { displayName }),
            ...(bio !== undefined && { bio }),
            ...(pfpUrl !== undefined && { pfpUrl }),
            updatedAt: new Date(),
        },
        include: {
            streak: true,
            achievements: {
                orderBy: { earnedAt: 'desc' },
                take: 10,
            },
            cryptoWallets: {
                orderBy: { isPrimary: 'desc' },
            },
        },
    });
    const stats = await getUserStats(updatedUser.id);
    res.json({
        success: true,
        user: formatUserProfile(updatedUser, stats),
    });
}));
// ============================================
// GET /api/users/me - Get own profile
// ============================================
router.get('/me', (0, express_async_handler_1.default)(async (req, res) => {
    const authUser = req.user;
    if (!authUser?.id) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
        return;
    }
    const user = await prisma.user.findUnique({
        where: { id: authUser.id },
        include: {
            streak: true,
            achievements: {
                orderBy: { earnedAt: 'desc' },
                take: 20,
            },
            cryptoWallets: {
                orderBy: { isPrimary: 'desc' },
            },
        },
    });
    if (!user) {
        res.status(404).json({
            success: false,
            message: 'User not found',
        });
        return;
    }
    const stats = await getUserStats(user.id);
    res.json({
        success: true,
        user: formatUserProfile(user, stats),
    });
}));
// ============================================
// GET /api/users - List users (for leaderboard/search)
// ============================================
router.get('/', (0, express_async_handler_1.default)(async (req, res) => {
    const { search, sortBy = 'points', limit = '20', offset = '0' } = req.query;
    // Build where clause
    const whereClause = {
        isBanned: false,
        ...(search && {
            OR: [
                { username: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };
    // Build order by
    const orderByMap = {
        points: { points: 'desc' },
        reputation: { reputation: 'desc' },
        level: { level: 'desc' },
        recent: { createdAt: 'desc' },
    };
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where: whereClause,
            orderBy: orderByMap[sortBy] || orderByMap.points,
            take: parseInt(limit),
            skip: parseInt(offset),
            select: {
                id: true,
                username: true,
                displayName: true,
                pfpUrl: true,
                points: true,
                reputation: true,
                level: true,
                membershipTier: true,
                createdAt: true,
                _count: {
                    select: {
                        ideas: true,
                        achievements: true,
                    },
                },
            },
        }),
        prisma.user.count({ where: whereClause }),
    ]);
    res.json({
        success: true,
        users: users.map(u => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            pfpUrl: u.pfpUrl,
            points: u.points,
            reputation: u.reputation,
            level: u.level,
            membershipTier: u.membershipTier,
            ideasCount: u._count.ideas,
            achievementsCount: u._count.achievements,
            createdAt: u.createdAt.toISOString(),
        })),
        total,
        hasMore: parseInt(offset) + users.length < total,
    });
}));
exports.default = router;
//# sourceMappingURL=users.js.map