// ============================================================================
// 24HRMVP Phase 4: Livestream API Routes
// backend/src/routes/livestream.routes.ts
// ============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import livestreamService from '../services/livestream.service';
import { castrService } from '../services/castr.service';
import { StreamStatus, StreamPlatform } from '../types/livestream.types';

const router = Router();

// Validation schemas
const createLivestreamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  thumbnailUrl: z.string().url().optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPublic: z.boolean().optional(),
  allowChat: z.boolean().optional(),
});

const updateLivestreamSchema = createLivestreamSchema.partial();

const addDestinationSchema = z.object({
  platform: z.nativeEnum(StreamPlatform),
  name: z.string().min(1).max(100),
  rtmpUrl: z.string().url().optional(),
  streamKey: z.string().min(1).optional(),
});

// Middleware to get user ID from auth (assumes auth middleware sets req.user)
function getUserId(req: Request): string {
  const user = (req as any).user;
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
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const input = createLivestreamSchema.parse(req.body);

    const stream = await livestreamService.createLivestream(userId, {
      ...input,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    });

    res.status(201).json(stream);
  } catch (error: any) {
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
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, hostId, isPublic, limit, cursor } = req.query;

    // Parse status filter
    let statusFilter: StreamStatus[] | undefined;
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      statusFilter = statuses.filter((s) =>
        Object.values(StreamStatus).includes(s as StreamStatus)
      ) as StreamStatus[];
    }

    const result = await livestreamService.getStreams({
      status: statusFilter,
      hostId: hostId as string | undefined,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string | undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('List livestreams error:', error);
    res.status(500).json({ error: 'Failed to fetch livestreams' });
  }
});

/**
 * GET /api/livestream/live
 * Get currently live streams
 */
router.get('/live', async (req: Request, res: Response) => {
  try {
    const result = await livestreamService.getStreams({
      status: [StreamStatus.LIVE],
      isPublic: true,
      limit: 50,
    });

    res.json(result.streams);
  } catch (error: any) {
    console.error('Get live streams error:', error);
    res.status(500).json({ error: 'Failed to fetch live streams' });
  }
});

/**
 * GET /api/livestream/upcoming
 * Get scheduled streams
 */
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const result = await livestreamService.getStreams({
      status: [StreamStatus.SCHEDULED],
      isPublic: true,
      limit: 20,
    });

    res.json(result.streams);
  } catch (error: any) {
    console.error('Get upcoming streams error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming streams' });
  }
});

/**
 * GET /api/livestream/:id
 * Get livestream details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const stream = await livestreamService.getLivestream(req.params.id);

    if (!stream) {
      return res.status(404).json({ error: 'Livestream not found' });
    }

    res.json(stream);
  } catch (error: any) {
    console.error('Get livestream error:', error);
    res.status(500).json({ error: 'Failed to fetch livestream' });
  }
});

/**
 * PATCH /api/livestream/:id
 * Update livestream
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const input = updateLivestreamSchema.parse(req.body);

    const stream = await livestreamService.updateLivestream(req.params.id, userId, {
      ...input,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    });

    res.json(stream);
  } catch (error: any) {
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
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await livestreamService.deleteLivestream(req.params.id, userId);
    res.status(204).send();
  } catch (error: any) {
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
router.get('/:id/destinations', async (req: Request, res: Response) => {
  try {
    const stream = await livestreamService.getLivestream(req.params.id);

    if (!stream) {
      return res.status(404).json({ error: 'Livestream not found' });
    }

    res.json(stream.destinations);
  } catch (error: any) {
    console.error('Get destinations error:', error);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

/**
 * POST /api/livestream/:id/destinations
 * Add destination to stream
 */
router.post('/:id/destinations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const input = addDestinationSchema.parse(req.body);

    const stream = await livestreamService.addDestination(req.params.id, userId, input);

    res.status(201).json(stream);
  } catch (error: any) {
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
router.delete('/:id/destinations/:platform', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const platform = req.params.platform as StreamPlatform;

    const stream = await livestreamService.removeDestination(
      req.params.id,
      userId,
      platform
    );

    res.json(stream);
  } catch (error: any) {
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
router.get('/:id/credentials', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const credentials = await livestreamService.getStreamCredentials(req.params.id, userId);

    if (!credentials) {
      return res.status(404).json({ error: 'Credentials not found' });
    }

    res.json(credentials);
  } catch (error: any) {
    console.error('Get credentials error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

/**
 * GET /api/livestream/platform/:platform/info
 * Get platform RTMP info and instructions
 */
router.get('/platform/:platform/info', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform as StreamPlatform;
    const info = castrService.getPlatformInfo(platform);

    if (!info) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    res.json(info);
  } catch (error: any) {
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
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const stream = await livestreamService.goLive(req.params.id, userId);
    res.json(stream);
  } catch (error: any) {
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
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const stream = await livestreamService.endStream(req.params.id, userId);
    res.json(stream);
  } catch (error: any) {
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
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const userId = (req as any).user?.id;
    const viewerCount = await livestreamService.viewerJoined(
      req.params.id,
      sessionId,
      userId
    );

    res.json({ viewerCount });
  } catch (error: any) {
    console.error('Viewer join error:', error);
    res.status(500).json({ error: 'Failed to track viewer' });
  }
});

/**
 * POST /api/livestream/:id/leave
 * Track viewer leaving stream
 */
router.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const viewerCount = await livestreamService.viewerLeft(req.params.id, sessionId);
    res.json({ viewerCount });
  } catch (error: any) {
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
router.post('/webhook/castr', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-castr-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (signature && !castrService.verifyWebhookSignature(payload, signature)) {
      console.warn('Invalid Castr webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    await livestreamService.handleCastrWebhook(req.body);
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Castr webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
