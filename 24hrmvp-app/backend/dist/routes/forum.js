"use strict";
// ============================================
// 24HRMVP - THE GRID FORUM ROUTES
// File: backend/src/routes/forum.ts
// Forum API endpoints with type-safe auth
// 
// FIXED: Added non-null assertions for req.user in requireAuth handlers
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const forum_1 = require("../services/forum");
const moderation_1 = require("../services/moderation");
const client_2 = require("@prisma/client");
const gridAuth_1 = require("../middleware/gridAuth");
const router = (0, express_1.Router)();
// ============================================
// PUBLIC ENDPOINTS
// ============================================
/**
 * GET /api/grid/forum
 * Get forum feed with sorting and filtering
 */
router.get('/', gridAuth_1.optionalAuth, async (req, res) => {
    try {
        const params = {
            sort: req.query.sort || 'hot',
            type: req.query.type,
            timeframe: req.query.timeframe || 'week',
            page: parseInt(req.query.page) || 1,
            limit: Math.min(parseInt(req.query.limit) || 20, 50),
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
        };
        const userId = (0, gridAuth_1.getAuthUser)(req)?.id;
        const feed = await forum_1.forumService.getFeed(params, userId);
        res.json({
            success: true,
            ...feed,
        });
    }
    catch (error) {
        console.error('Error fetching forum feed:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch forum feed',
        });
    }
});
/**
 * GET /api/grid/forum/post/:slug
 * Get a single post by slug
 */
router.get('/post/:slug', gridAuth_1.optionalAuth, async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = (0, gridAuth_1.getAuthUser)(req)?.id;
        const post = await forum_1.forumService.getPost(slug, userId);
        if (!post) {
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Post not found',
            });
            return;
        }
        res.json({
            success: true,
            post,
        });
    }
    catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch post',
        });
    }
});
/**
 * GET /api/grid/forum/thread/:slug
 * Get post with replies (thread view)
 */
router.get('/thread/:slug', gridAuth_1.optionalAuth, async (req, res) => {
    try {
        const { slug } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const userId = (0, gridAuth_1.getAuthUser)(req)?.id;
        const thread = await forum_1.forumService.getThread(slug, { page, limit }, userId);
        res.json({
            success: true,
            ...thread,
        });
    }
    catch (error) {
        if (error.message === 'Post not found') {
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Post not found',
            });
            return;
        }
        console.error('Error fetching thread:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch thread',
        });
    }
});
// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================
/**
 * POST /api/grid/forum
 * Create a new forum post
 *
 * Uses requireAuth wrapper for type-safe user access
 */
router.post('/', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const { title, content, type, parentId, ideaId, tags } = req.body;
        // Validate required fields
        if (!content || content.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Content is required',
            });
            return;
        }
        // Moderate content before creating
        const modResult = await moderation_1.moderationService.checkAndQueue(client_2.ModerationEntityType.FORUM_POST, 'new-post', // Placeholder - actual ID assigned after creation
        content);
        if (!modResult.approved && modResult.action === 'FLAGGED') {
            res.status(400).json({
                success: false,
                error: 'Content Flagged',
                message: 'Your post has been flagged for review. Please revise the content.',
                reason: modResult.reason,
            });
            return;
        }
        const postData = {
            title: title?.trim(),
            content: content.trim(),
            type: type || client_1.PostType.DISCUSSION,
            parentId,
            ideaId,
            tags: tags || [],
        };
        // req.user is guaranteed to be defined by requireAuth
        // Using non-null assertion (!) to tell TypeScript this is safe
        const post = await forum_1.forumService.createPost(req.user.id, postData);
        res.status(201).json({
            success: true,
            post,
        });
    }
    catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to create post',
        });
    }
}));
/**
 * PUT /api/grid/forum/post/:slug
 * Update a forum post
 */
router.put('/post/:slug', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const { slug } = req.params;
        const { title, content, tags, isPinned, isLocked } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (content !== undefined)
            updateData.content = content;
        if (tags !== undefined)
            updateData.tags = tags;
        if (isPinned !== undefined)
            updateData.isPinned = isPinned;
        if (isLocked !== undefined)
            updateData.isLocked = isLocked;
        // req.user is guaranteed by requireAuth
        const post = await forum_1.forumService.updatePost(slug, req.user.id, updateData);
        res.json({
            success: true,
            post,
        });
    }
    catch (error) {
        if (error.message === 'Post not found') {
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Post not found',
            });
            return;
        }
        if (error.message === 'Not authorized to edit this post') {
            res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'You are not authorized to edit this post',
            });
            return;
        }
        console.error('Error updating post:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to update post',
        });
    }
}));
/**
 * DELETE /api/grid/forum/post/:slug
 * Delete a forum post
 */
router.delete('/post/:slug', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const { slug } = req.params;
        // req.user is guaranteed by requireAuth
        await forum_1.forumService.deletePost(slug, req.user.id);
        res.json({
            success: true,
            message: 'Post deleted successfully',
        });
    }
    catch (error) {
        if (error.message === 'Post not found') {
            res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Post not found',
            });
            return;
        }
        if (error.message === 'Not authorized to delete this post') {
            res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'You are not authorized to delete this post',
            });
            return;
        }
        console.error('Error deleting post:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to delete post',
        });
    }
}));
/**
 * POST /api/grid/forum/post/:postId/vote
 * Vote on a post
 */
router.post('/post/:postId/vote', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const { postId } = req.params;
        const { value } = req.body;
        if (value !== 1 && value !== -1) {
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Vote value must be 1 (upvote) or -1 (downvote)',
            });
            return;
        }
        // req.user is guaranteed by requireAuth
        const result = await forum_1.forumService.vote(postId, req.user.id, value);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('Error voting:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to vote',
        });
    }
}));
/**
 * DELETE /api/grid/forum/post/:postId/vote
 * Remove vote from a post
 */
router.delete('/post/:postId/vote', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const { postId } = req.params;
        // req.user is guaranteed by requireAuth
        const result = await forum_1.forumService.removeVote(postId, req.user.id);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('Error removing vote:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to remove vote',
        });
    }
}));
/**
 * POST /api/grid/forum/post/:postId/bookmark
 * Bookmark a post
 */
router.post('/post/:postId/bookmark', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const { postId } = req.params;
        // req.user is guaranteed by requireAuth
        await forum_1.forumService.bookmark(postId, req.user.id);
        res.json({
            success: true,
            message: 'Post bookmarked',
        });
    }
    catch (error) {
        if (error.code === 'P2002') {
            res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Post already bookmarked',
            });
            return;
        }
        console.error('Error bookmarking post:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to bookmark post',
        });
    }
}));
/**
 * DELETE /api/grid/forum/post/:postId/bookmark
 * Remove bookmark from a post
 */
router.delete('/post/:postId/bookmark', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const { postId } = req.params;
        // req.user is guaranteed by requireAuth
        await forum_1.forumService.removeBookmark(postId, req.user.id);
        res.json({
            success: true,
            message: 'Bookmark removed',
        });
    }
    catch (error) {
        console.error('Error removing bookmark:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to remove bookmark',
        });
    }
}));
/**
 * GET /api/grid/forum/bookmarks
 * Get user's bookmarked posts
 */
router.get('/bookmarks', ...(0, gridAuth_1.requireAuth)(async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        // req.user is guaranteed by requireAuth
        const bookmarks = await forum_1.forumService.getUserBookmarks(req.user.id, { page, limit });
        res.json({
            success: true,
            ...bookmarks,
        });
    }
    catch (error) {
        console.error('Error fetching bookmarks:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch bookmarks',
        });
    }
}));
exports.default = router;
//# sourceMappingURL=forum.js.map