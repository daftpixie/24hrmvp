"use strict";
// ============================================================================
// 24HRMVP Phase 4: Livestream API Routes
// backend/src/routes/livestream.routes.ts
// ============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const livestream_service_1 = __importDefault(require("../services/livestream.service"));
const castr_service_1 = require("../services/castr.service");
const livestream_types_1 = require("../types/livestream.types");
const router = (0, express_1.Router)();
// Validation schemas
const createLivestreamSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(2000).optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
    thumbnailUrl: zod_1.z.string().url().optional(),
    category: zod_1.z.string().max(50).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(30)).max(10).optional(),
    isPublic: zod_1.z.boolean().optional(),
    allowChat: zod_1.z.boolean().optional(),
});
const updateLivestreamSchema = createLivestreamSchema.partial();
const addDestinationSchema = zod_1.z.object({
    platform: zod_1.z.nativeEnum(livestream_types_1.StreamPlatform),
    name: zod_1.z.string().min(1).max(100),
    rtmpUrl: zod_1.z.string().url().optional(),
    streamKey: zod_1.z.string().min(1).optional(),
});
// Middleware to get user ID from auth (assumes auth middleware sets req.user)
function getUserId(req) {
    const user = req.user;
    if (!user?.id) {
        throw new Error('Unauthorized');
    }
    return user.id;
}
// ============================================================================
// CRUD Routes
// ============================================================================
/**
 * POST /api/livestream
 * Create a new livestream
 */
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        const input = createLivestreamSchema.parse(req.body);
        const stream = await livestream_service_1.default.createLivestream(userId, {
            ...input,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        });
        res.status(201).json(stream);
    }
    catch (error) {
        console.error('Create livestream error:', error);
        res.status(error.message === 'Unauthorized' ? 401 : 400).json({
            error: error.message || 'Failed to create livestream',
        });
    }
});
/**
 * GET /api/livestream
 * List livestreams with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { status, hostId, isPublic, limit, cursor } = req.query;
        // Parse status filter
        let statusFilter;
        if (status) {
            const statuses = Array.isArray(status) ? status : [status];
            statusFilter = statuses.filter((s) => Object.values(livestream_types_1.StreamStatus).includes(s));
        }
        const result = await livestream_service_1.default.getStreams({
            status: statusFilter,
            hostId: hostId,
            isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            cursor: cursor,
        });
        res.json(result);
    }
    catch (error) {
        console.error('List livestreams error:', error);
        res.status(500).json({ error: 'Failed to fetch livestreams' });
    }
});
/**
 * GET /api/livestream/live
 * Get currently live streams
 */
router.get('/live', async (req, res) => {
    try {
        const result = await livestream_service_1.default.getStreams({
            status: [livestream_types_1.StreamStatus.LIVE],
            isPublic: true,
            limit: 50,
        });
        res.json(result.streams);
    }
    catch (error) {
        console.error('Get live streams error:', error);
        res.status(500).json({ error: 'Failed to fetch live streams' });
    }
});
/**
 * GET /api/livestream/upcoming
 * Get scheduled streams
 */
router.get('/upcoming', async (req, res) => {
    try {
        const result = await livestream_service_1.default.getStreams({
            status: [livestream_types_1.StreamStatus.SCHEDULED],
            isPublic: true,
            limit: 20,
        });
        res.json(result.streams);
    }
    catch (error) {
        console.error('Get upcoming streams error:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming streams' });
    }
});
/**
 * GET /api/livestream/:id
 * Get livestream details
 */
router.get('/:id', async (req, res) => {
    try {
        const stream = await livestream_service_1.default.getLivestream(req.params.id);
        if (!stream) {
            return res.status(404).json({ error: 'Livestream not found' });
        }
        res.json(stream);
    }
    catch (error) {
        console.error('Get livestream error:', error);
        res.status(500).json({ error: 'Failed to fetch livestream' });
    }
});
/**
 * PATCH /api/livestream/:id
 * Update livestream
 */
router.patch('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        const input = updateLivestreamSchema.parse(req.body);
        const stream = await livestream_service_1.default.updateLivestream(req.params.id, userId, {
            ...input,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        });
        res.json(stream);
    }
    catch (error) {
        console.error('Update livestream error:', error);
        res.status(error.message?.includes('not found') ? 404 : 400).json({
            error: error.message || 'Failed to update livestream',
        });
    }
});
/**
 * DELETE /api/livestream/:id
 * Delete livestream
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        await livestream_service_1.default.deleteLivestream(req.params.id, userId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete livestream error:', error);
        res.status(error.message?.includes('not found') ? 404 : 400).json({
            error: error.message || 'Failed to delete livestream',
        });
    }
});
// ============================================================================
// Destination Management
// ============================================================================
/**
 * GET /api/livestream/:id/destinations
 * Get destinations for a stream
 */
router.get('/:id/destinations', async (req, res) => {
    try {
        const stream = await livestream_service_1.default.getLivestream(req.params.id);
        if (!stream) {
            return res.status(404).json({ error: 'Livestream not found' });
        }
        res.json(stream.destinations);
    }
    catch (error) {
        console.error('Get destinations error:', error);
        res.status(500).json({ error: 'Failed to fetch destinations' });
    }
});
/**
 * POST /api/livestream/:id/destinations
 * Add destination to stream
 */
router.post('/:id/destinations', async (req, res) => {
    try {
        const userId = getUserId(req);
        const input = addDestinationSchema.parse(req.body);
        const stream = await livestream_service_1.default.addDestination(req.params.id, userId, input);
        res.status(201).json(stream);
    }
    catch (error) {
        console.error('Add destination error:', error);
        res.status(400).json({
            error: error.message || 'Failed to add destination',
        });
    }
});
/**
 * DELETE /api/livestream/:id/destinations/:platform
 * Remove destination from stream
 */
router.delete('/:id/destinations/:platform', async (req, res) => {
    try {
        const userId = getUserId(req);
        const platform = req.params.platform;
        const stream = await livestream_service_1.default.removeDestination(req.params.id, userId, platform);
        res.json(stream);
    }
    catch (error) {
        console.error('Remove destination error:', error);
        res.status(400).json({
            error: error.message || 'Failed to remove destination',
        });
    }
});
/**
 * GET /api/livestream/:id/credentials
 * Get RTMP credentials for OBS (host only)
 */
router.get('/:id/credentials', async (req, res) => {
    try {
        const userId = getUserId(req);
        const credentials = await livestream_service_1.default.getStreamCredentials(req.params.id, userId);
        if (!credentials) {
            return res.status(404).json({ error: 'Credentials not found' });
        }
        res.json(credentials);
    }
    catch (error) {
        console.error('Get credentials error:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
});
/**
 * GET /api/livestream/platform/:platform/info
 * Get platform RTMP info and instructions
 */
router.get('/platform/:platform/info', async (req, res) => {
    try {
        const platform = req.params.platform;
        const info = castr_service_1.castrService.getPlatformInfo(platform);
        if (!info) {
            return res.status(404).json({ error: 'Platform not found' });
        }
        res.json(info);
    }
    catch (error) {
        console.error('Get platform info error:', error);
        res.status(500).json({ error: 'Failed to get platform info' });
    }
});
// ============================================================================
// Stream Control
// ============================================================================
/**
 * POST /api/livestream/:id/start
 * Go live
 */
router.post('/:id/start', async (req, res) => {
    try {
        const userId = getUserId(req);
        const stream = await livestream_service_1.default.goLive(req.params.id, userId);
        res.json(stream);
    }
    catch (error) {
        console.error('Start stream error:', error);
        res.status(400).json({
            error: error.message || 'Failed to start stream',
        });
    }
});
/**
 * POST /api/livestream/:id/stop
 * End stream
 */
router.post('/:id/stop', async (req, res) => {
    try {
        const userId = getUserId(req);
        const stream = await livestream_service_1.default.endStream(req.params.id, userId);
        res.json(stream);
    }
    catch (error) {
        console.error('Stop stream error:', error);
        res.status(400).json({
            error: error.message || 'Failed to stop stream',
        });
    }
});
// ============================================================================
// Viewer Tracking
// ============================================================================
/**
 * POST /api/livestream/:id/join
 * Track viewer joining stream
 */
router.post('/:id/join', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }
        const userId = req.user?.id;
        const viewerCount = await livestream_service_1.default.viewerJoined(req.params.id, sessionId, userId);
        res.json({ viewerCount });
    }
    catch (error) {
        console.error('Viewer join error:', error);
        res.status(500).json({ error: 'Failed to track viewer' });
    }
});
/**
 * POST /api/livestream/:id/leave
 * Track viewer leaving stream
 */
router.post('/:id/leave', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }
        const viewerCount = await livestream_service_1.default.viewerLeft(req.params.id, sessionId);
        res.json({ viewerCount });
    }
    catch (error) {
        console.error('Viewer leave error:', error);
        res.status(500).json({ error: 'Failed to track viewer' });
    }
});
// ============================================================================
// Webhooks
// ============================================================================
/**
 * POST /api/webhook/castr
 * Handle Castr webhook events
 */
router.post('/webhook/castr', async (req, res) => {
    try {
        // Verify webhook signature
        const signature = req.headers['x-castr-signature'];
        const payload = JSON.stringify(req.body);
        if (signature && !castr_service_1.castrService.verifyWebhookSignature(payload, signature)) {
            console.warn('Invalid Castr webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        await livestream_service_1.default.handleCastrWebhook(req.body);
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Castr webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
exports.default = router;
//# sourceMappingURL=livestream.routes.js.map