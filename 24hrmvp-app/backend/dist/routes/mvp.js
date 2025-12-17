"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const index_1 = require("../index");
const router = (0, express_1.Router)();
router.post('/build', auth_1.authenticateUser, async (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { ideaId } = req.body;
    if (!ideaId) {
        res.status(400).json({ error: 'Idea ID required' });
        return;
    }
    try {
        const idea = await index_1.prisma.idea.findUnique({
            where: { id: ideaId },
            include: { votingCycle: true }
        });
        if (!idea) {
            res.status(404).json({ error: 'Idea not found' });
            return;
        }
        const project = await index_1.prisma.mVPProject.create({
            data: {
                ideaId: idea.id,
                status: 'queued',
                progress: 0,
                logs: [],
            },
        });
        res.json({
            success: true,
            project: {
                id: project.id,
                status: project.status,
                progress: project.progress,
            },
        });
    }
    catch (error) {
        console.error('MVP build error:', error);
        res.status(500).json({ error: 'Failed to queue MVP build' });
    }
});
router.get('/:projectId/status', async (req, res) => {
    const { projectId } = req.params;
    try {
        const project = await index_1.prisma.mVPProject.findUnique({
            where: { id: projectId },
            include: {
                idea: {
                    select: {
                        title: true,
                        description: true,
                    }
                }
            }
        });
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json({
            id: project.id,
            status: project.status,
            progress: project.progress,
            repoUrl: project.repoUrl,
            deploymentUrl: project.deploymentUrl,
            logs: project.logs,
            idea: project.idea,
        });
    }
    catch (error) {
        console.error('MVP status error:', error);
        res.status(500).json({ error: 'Failed to fetch project status' });
    }
});
exports.default = router;
//# sourceMappingURL=mvp.js.map