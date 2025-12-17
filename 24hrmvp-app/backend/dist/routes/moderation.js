"use strict";
// ============================================
// 24HRMVP - THE GRID MODERATION ROUTES
// File: backend/src/routes/moderation.ts
// Content moderation API endpoints
// 
// FIXED: Import requireAdmin (now exported from gridAuth)
// FIXED: Add explicit Request/Response types
// FIXED: Add non-null assertions for req.user
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const moderation_1 = require("../services/moderation");
const gridAuth_1 = require("../middleware/gridAuth");
const router = (0, express_1.Router)();
// ============================================
// ADMIN ENDPOINTS (require admin role)
// ============================================
/**
 * GET /api/grid/moderation/queue
 * Get moderation queue (admin only)
 */
router.get('/queue', ...(0, gridAuth_1.requireAdmin)(async (req, res) => {
    try {
        const params = {
            status: req.query.status,
            entityType: req.query.entityType,
            page: parseInt(req.query.page) || 1,
            limit: Math.min(parseInt(req.query.limit) || 20, 50),
        };
        const result = await moderation_1.moderationService.getQueue(params);
        res.json({
            success: true,
            items: result.items,
            total: result.total,
            pagination: {
                page: params.page,
                limit: params.limit,
                total: result.total,
                pages: Math.ceil(result.total / (params.limit || 20)),
            },
        });
    }
    catch (error) {
        console.error('Error fetching moderation queue:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch moderation queue',
        });
    }
}));
/**
 * GET /api/grid/moderation/queue/:id
 * Get a single queue item (admin only)
 */
router.get('/queue/:id', ...(0, gridAuth_1.requireAdmin)(async (req, res) => {
    try {
        const { id } = req.params;
        const item = await moderation_1.moderationService.getQueueItem(id);
        if (!item) {
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Queue item not found',
            });
            return;
        }
        res.json({
            success: true,
            item,
        });
    }
    catch (error) {
        console.error('Error fetching queue item:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch queue item',
        });
    }
}));
/**
 * POST /api/grid/moderation/queue/:id/review
 * Review a moderation queue item (admin only)
 */
router.post('/queue/:id/review', ...(0, gridAuth_1.requireAdmin)(async (req, res) => {
    try {
        const { id } = req.params;
        const { action, notes } = req.body;
        // Validate action
        const validActions = Object.values(client_1.ModerationStatus);
        if (!validActions.includes(action)) {
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
            });
            return;
        }
        const decision = {
            action,
            notes,
        };
        // req.user is guaranteed by requireAdmin
        const item = await moderation_1.moderationService.review(id, req.user.id, decision);
        res.json({
            success: true,
            item,
        });
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Queue item not found',
            });
            return;
        }
        console.error('Error reviewing item:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to review item',
        });
    }
}));
/**
 * GET /api/grid/moderation/stats
 * Get moderation statistics (admin only)
 */
router.get('/stats', ...(0, gridAuth_1.requireAdmin)(async (req, res) => {
    try {
        const stats = await moderation_1.moderationService.getStats();
        res.json({
            success: true,
            stats,
        });
    }
    catch (error) {
        console.error('Error fetching moderation stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch moderation stats',
        });
    }
}));
// ============================================
// USER ENDPOINTS (authenticated users)
// ============================================
/**
 * POST /api/grid/moderation/report
 * Report content for moderation
 */
router.post('/report', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const { entityType, entityId, reason } = req.body;
        // Validate entity type
        const validTypes = Object.values(client_1.ModerationEntityType);
        if (!validTypes.includes(entityType)) {
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: `Invalid entity type. Must be one of: ${validTypes.join(', ')}`,
            });
            return;
        }
        if (!entityId) {
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'entityId is required',
            });
            return;
        }
        if (!reason || reason.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Reason is required',
            });
            return;
        }
        // req.user is guaranteed by requireAuth
        await moderation_1.moderationService.reportContent(entityType, entityId, req.user.id, reason.trim());
        res.json({
            success: true,
            message: 'Report submitted successfully',
        });
    }
    catch (error) {
        console.error('Error reporting content:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to submit report',
        });
    }
}));
/**
 * POST /api/grid/moderation/check
 * Check content before posting (preview moderation)
 * Useful for showing users if their content might be flagged
 */
router.post('/check', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Content is required',
            });
            return;
        }
        const result = await moderation_1.moderationService.moderateContent(content);
        // Don't expose detailed scores to users
        res.json({
            success: true,
            flagged: result.flagged,
            categories: Object.entries(result.categories)
                .filter(([_, flagged]) => flagged)
                .map(([category]) => category),
        });
    }
    catch (error) {
        console.error('Error checking content:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to check content',
        });
    }
}));
exports.default = router;
//# sourceMappingURL=moderation.js.map