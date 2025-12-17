"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const index_1 = require("../index");
const router = (0, express_1.Router)();
/**
 * GET /api/cycles/active
 * Get current active voting cycle with ideas
 */
router.get('/active', auth_1.optionalAuth, async (req, res) => {
    try {
        const activeCycle = await index_1.prisma.votingCycle.findFirst({
            where: { status: 'active' },
            include: {
                ideas: {
                    where: { status: 'approved' },
                    include: {
                        submittedBy: {
                            select: {
                                fid: true,
                                username: true,
                                displayName: true,
                                pfpUrl: true,
                            },
                        },
                        _count: {
                            select: {
                                votes: true,
                                comments: true,
                            },
                        },
                    },
                    orderBy: {
                        voteCount: 'desc',
                    },
                },
            },
        });
        if (!activeCycle) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'No active voting cycle',
            });
        }
        // Calculate time remaining
        const now = new Date();
        const endDate = new Date(activeCycle.endDate);
        const timeRemaining = endDate.getTime() - now.getTime();
        const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
        res.json({
            success: true,
            cycle: {
                ...activeCycle,
                hoursRemaining,
            },
        });
    }
    catch (error) {
        console.error('Get active cycle error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get active cycle',
        });
    }
});
/**
 * GET /api/cycles
 * Get all voting cycles
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const cycles = await index_1.prisma.votingCycle.findMany({
            include: {
                _count: {
                    select: {
                        ideas: true,
                    },
                },
                winner: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        submittedBy: {
                            select: {
                                fid: true,
                                username: true,
                                displayName: true,
                                pfpUrl: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                startDate: 'desc',
            },
            skip,
            take: limit,
        });
        const total = await index_1.prisma.votingCycle.count();
        res.json({
            success: true,
            cycles,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Get cycles error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get cycles',
        });
    }
});
/**
 * POST /api/cycles
 * Create new voting cycle (admin only)
 */
router.post('/', auth_1.verifyFarcasterAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { name, startDate, endDate } = req.body;
        if (!name || !startDate || !endDate) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'name, startDate, and endDate are required',
            });
        }
        const cycle = await index_1.prisma.votingCycle.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'active',
            },
        });
        res.status(201).json({
            success: true,
            cycle,
        });
    }
    catch (error) {
        console.error('Create cycle error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create cycle',
        });
    }
});
exports.default = router;
//# sourceMappingURL=votingCycles.js.map