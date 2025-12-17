"use strict";
// ============================================
// 24HRMVP - THE GRID MAIN ROUTER
// File: backend/src/routes/grid.ts
// Aggregates all Grid sub-routes
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const forum_1 = __importDefault(require("./forum"));
const moderation_1 = __importDefault(require("./moderation"));
const social_1 = __importDefault(require("./social"));
const router = (0, express_1.Router)();
// ============================================
// MOUNT SUB-ROUTES
// ============================================
// Forum routes: /api/grid/forum/*
router.use('/forum', forum_1.default);
// Social aggregation routes: /api/grid/social/*
router.use('/social', social_1.default);
// Moderation routes: /api/grid/moderation/*
router.use('/moderation', moderation_1.default);
// ============================================
// GRID ROOT ENDPOINTS
// ============================================
/**
 * GET /api/grid
 * Grid API info endpoint
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        name: 'The Grid API',
        version: '1.0.0',
        description: 'Community hub for 24HRMVP',
        endpoints: {
            forum: {
                base: '/api/grid/forum',
                routes: [
                    'GET / - Feed with sorting/filtering',
                    'GET /post/:slug - Single post',
                    'GET /thread/:slug - Post with replies',
                    'POST / - Create post (auth required)',
                    'PUT /post/:slug - Update post (auth required)',
                    'DELETE /post/:slug - Delete post (auth required)',
                    'POST /post/:postId/vote - Vote on post (auth required)',
                    'DELETE /post/:postId/vote - Remove vote (auth required)',
                    'POST /post/:postId/bookmark - Bookmark post (auth required)',
                    'DELETE /post/:postId/bookmark - Remove bookmark (auth required)',
                    'GET /bookmarks - Get user bookmarks (auth required)',
                ],
            },
            social: {
                base: '/api/grid/social',
                routes: [
                    'GET / - Aggregated social feed',
                    'GET /trending - Trending posts',
                    'GET /hashtag/:tag - Posts by hashtag',
                    'GET /user/:fid - Posts by Farcaster user',
                    'GET /farcaster/channels - Trending channels',
                    'GET /farcaster/channel/:channelId - Channel details',
                    'GET /farcaster/channel/:channelId/feed - Live channel feed',
                    'GET /farcaster/cast/:hash - Single cast',
                    'POST /sync/:channelId - Sync channel (admin)',
                    'POST /:postId/feature - Feature post (admin)',
                    'POST /:postId/hide - Hide post (admin)',
                ],
            },
            moderation: {
                base: '/api/grid/moderation',
                routes: [
                    'GET /queue - Moderation queue (admin)',
                    'GET /queue/:id - Queue item details (admin)',
                    'POST /queue/:id/review - Review item (admin)',
                    'GET /stats - Moderation stats (admin)',
                    'POST /report - Report content (auth required)',
                    'POST /check - Check content preview (auth required)',
                ],
            },
        },
        status: 'operational',
        timestamp: new Date().toISOString(),
    });
});
/**
 * GET /api/grid/health
 * Grid-specific health check
 */
router.get('/health', async (req, res) => {
    // Import here to avoid circular dependency issues
    const { checkRedisHealth } = await Promise.resolve().then(() => __importStar(require('../services/redis')));
    const { neynarService } = await Promise.resolve().then(() => __importStar(require('../services/neynar')));
    const redisHealth = await checkRedisHealth();
    res.json({
        success: true,
        status: 'healthy',
        components: {
            forum: 'operational',
            social: neynarService.isConfigured() ? 'operational' : 'degraded (no API key)',
            moderation: 'operational',
            cache: redisHealth.connected ? 'operational' : 'degraded (memory fallback)',
        },
        details: {
            redis: {
                connected: redisHealth.connected,
                latency: redisHealth.latency,
            },
            neynar: {
                configured: neynarService.isConfigured(),
            },
        },
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=grid.js.map