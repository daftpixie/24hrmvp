"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const payment_1 = require("../middleware/payment");
const index_1 = require("../index");
const router = (0, express_1.Router)();
// Submit idea with standard payment (1 vote)
router.post('/standard', auth_1.authenticate, (0, payment_1.requirePayment)('standard'), async (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { title, description, category, complexity, tags, attachments } = req.body;
    const paymentId = req.body.paymentId || req.query.paymentId;
    try {
        const activeCycle = await index_1.prisma.votingCycle.findFirst({
            where: { status: 'active' }
        });
        if (!activeCycle) {
            res.status(400).json({ error: 'No active voting cycle' });
            return;
        }
        const idea = await index_1.prisma.idea.create({
            data: {
                title,
                description,
                category,
                complexity: complexity || 'medium',
                tags: tags || [],
                attachments: attachments || [],
                userId: req.user.id,
                votingCycleId: activeCycle.id,
                status: 'approved',
                voteCount: 1,
            },
            include: {
                submittedBy: {
                    select: {
                        username: true,
                        displayName: true,
                        pfpUrl: true,
                    }
                }
            }
        });
        await index_1.prisma.pointHistory.create({
            data: {
                userId: req.user.id,
                points: 10,
                action: 'idea_submitted_paid',
                description: `Submitted idea: ${title} (Standard tier)`,
                sourceId: idea.id,
            }
        });
        await index_1.prisma.user.update({
            where: { id: req.user.id },
            data: { points: { increment: 10 } }
        });
        res.status(201).json({
            success: true,
            idea,
            payment: { tier: 'standard', paymentId }
        });
    }
    catch (error) {
        console.error('Paid idea submission error:', error);
        res.status(500).json({ error: 'Failed to submit idea' });
    }
});
// Submit idea with priority payment (3 votes + 1 boost)
router.post('/priority', auth_1.authenticate, (0, payment_1.requirePayment)('priority'), async (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { title, description, category, complexity, tags, attachments } = req.body;
    const paymentId = req.body.paymentId || req.query.paymentId;
    try {
        const activeCycle = await index_1.prisma.votingCycle.findFirst({
            where: { status: 'active' }
        });
        if (!activeCycle) {
            res.status(400).json({ error: 'No active voting cycle' });
            return;
        }
        const idea = await index_1.prisma.idea.create({
            data: {
                title,
                description,
                category,
                complexity: complexity || 'medium',
                tags: tags || [],
                attachments: attachments || [],
                userId: req.user.id,
                votingCycleId: activeCycle.id,
                status: 'approved',
                voteCount: 3,
                voteWeight: 5,
            },
            include: {
                submittedBy: {
                    select: {
                        username: true,
                        displayName: true,
                        pfpUrl: true,
                    }
                }
            }
        });
        await index_1.prisma.pointHistory.create({
            data: {
                userId: req.user.id,
                points: 25,
                action: 'idea_submitted_priority',
                description: `Submitted priority idea: ${title}`,
                sourceId: idea.id,
            }
        });
        await index_1.prisma.user.update({
            where: { id: req.user.id },
            data: { points: { increment: 25 } }
        });
        res.status(201).json({
            success: true,
            idea,
            payment: { tier: 'priority', paymentId }
        });
    }
    catch (error) {
        console.error('Priority idea submission error:', error);
        res.status(500).json({ error: 'Failed to submit priority idea' });
    }
});
// Submit idea with premium payment (10 votes + 3 boosts)
router.post('/premium', auth_1.authenticate, (0, payment_1.requirePayment)('premium'), async (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { title, description, category, complexity, tags, attachments } = req.body;
    const paymentId = req.body.paymentId || req.query.paymentId;
    try {
        const activeCycle = await index_1.prisma.votingCycle.findFirst({
            where: { status: 'active' }
        });
        if (!activeCycle) {
            res.status(400).json({ error: 'No active voting cycle' });
            return;
        }
        const idea = await index_1.prisma.idea.create({
            data: {
                title,
                description,
                category,
                complexity: complexity || 'complex',
                tags: tags || [],
                attachments: attachments || [],
                userId: req.user.id,
                votingCycleId: activeCycle.id,
                status: 'approved',
                voteCount: 10,
                voteWeight: 20,
            },
            include: {
                submittedBy: {
                    select: {
                        username: true,
                        displayName: true,
                        pfpUrl: true,
                    }
                }
            }
        });
        await index_1.prisma.pointHistory.create({
            data: {
                userId: req.user.id,
                points: 50,
                action: 'idea_submitted_premium',
                description: `Submitted premium idea: ${title}`,
                sourceId: idea.id,
            }
        });
        await index_1.prisma.user.update({
            where: { id: req.user.id },
            data: { points: { increment: 50 } }
        });
        res.status(201).json({
            success: true,
            idea,
            payment: { tier: 'premium', paymentId }
        });
    }
    catch (error) {
        console.error('Premium idea submission error:', error);
        res.status(500).json({ error: 'Failed to submit premium idea' });
    }
});
exports.default = router;
//# sourceMappingURL=ideas-with-payment.js.map