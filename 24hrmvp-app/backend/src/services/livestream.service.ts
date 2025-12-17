// ============================================================================
// 24HRMVP Phase 4: Livestream Service
// backend/src/services/livestream.service.ts
// ============================================================================

import { PrismaClient, Livestream, StreamStatus, Prisma } from '@prisma/client';
import { castrService } from './castr.service';
import { getIO } from './websocket';
import {
  CreateLivestreamInput,
  UpdateLivestreamInput,
  AddDestinationInput,
  StreamDestination,
  StreamPlatform,
  LivestreamWithHost,
} from '../types/livestream.types';

const prisma = new PrismaClient();

// Helper to parse JSON destinations safely
function parseDestinations(destinations: Prisma.JsonValue | null | undefined): StreamDestination[] {
  if (!destinations) return [];
  if (typeof destinations === 'string') {
    try {
      return JSON.parse(destinations);
    } catch {
      return [];
    }
  }
  if (Array.isArray(destinations)) {
    return destinations as unknown as StreamDestination[];
  }
  return [];
}

// Transform Prisma result to typed response
function transformLivestream(stream: Livestream & { host?: { id: string; username: string; displayName: string | null; pfpUrl: string | null } }): LivestreamWithHost {
  return {
    ...stream,
    destinations: parseDestinations(stream.destinations),
    status: stream.status as StreamStatus,
  } as LivestreamWithHost;
}

/**
 * Create a new livestream
 */
export async function createLivestream(
  hostId: string,
  input: CreateLivestreamInput
): Promise<LivestreamWithHost> {
  // Create Castr stream
  let castrStream = null;
  if (castrService.isConfigured()) {
    try {
      castrStream = await castrService.createStream(input.title, {
        enableRecording: true,
        enableABR: false,
      });
    } catch (error) {
      console.error('Failed to create Castr stream:', error);
      // Continue without Castr - can add later
    }
  }

  // Create chat room for the stream
  const chatRoom = await prisma.chatRoom.create({
    data: {
      name: `Stream: ${input.title}`,
      slug: `stream-${Date.now()}`,
      description: `Live chat for: ${input.title}`,
      type: input.isPublic !== false ? 'PUBLIC' : 'PRIVATE',
      createdById: hostId,
    },
  });

  // Create livestream record
  const livestream = await prisma.livestream.create({
    data: {
      title: input.title,
      description: input.description,
      status: input.scheduledAt ? StreamStatus.SCHEDULED : StreamStatus.DRAFT,
      hostId,
      scheduledAt: input.scheduledAt,
      thumbnailUrl: input.thumbnailUrl,
      placeholderUrl: '/images/stream-placeholder.png', // Default placeholder
      category: input.category,
      tags: input.tags || [],
      isPublic: input.isPublic ?? true,
      allowChat: input.allowChat ?? true,
      chatRoomId: chatRoom.id,
      // Castr integration
      castrStreamId: castrStream?._id,
      castrIngestUrl: castrStream?.ingest?.rtmp?.url,
      castrStreamKey: castrStream?.ingest?.rtmp?.key,
      playbackUrl: castrStream?.playback?.hls,
      destinations: [] as Prisma.InputJsonValue,
    },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, pfpUrl: true },
      },
    },
  });

  return transformLivestream(livestream);
}

/**
 * Get livestream by ID
 */
export async function getLivestream(id: string): Promise<LivestreamWithHost | null> {
  const stream = await prisma.livestream.findUnique({
    where: { id },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, pfpUrl: true },
      },
    },
  });

  if (!stream) return null;
  return transformLivestream(stream);
}

/**
 * Get all livestreams with filters
 */
export async function getStreams(options: {
  status?: StreamStatus[];
  hostId?: string;
  isPublic?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<{ streams: LivestreamWithHost[]; nextCursor: string | null }> {
  const { status, hostId, isPublic, limit = 20, cursor } = options;

  const where: Prisma.LivestreamWhereInput = {};
  if (status?.length) where.status = { in: status };
  if (hostId) where.hostId = hostId;
  if (isPublic !== undefined) where.isPublic = isPublic;

  const streams = await prisma.livestream.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [
      { status: 'asc' }, // LIVE first
      { scheduledAt: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      host: {
        select: { id: true, username: true, displayName: true, pfpUrl: true },
      },
    },
  });

  const hasMore = streams.length > limit;
  const results = hasMore ? streams.slice(0, -1) : streams;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    streams: results.map(transformLivestream),
    nextCursor,
  };
}

/**
 * Update livestream
 */
export async function updateLivestream(
  id: string,
  hostId: string,
  input: UpdateLivestreamInput
): Promise<LivestreamWithHost> {
  // Verify ownership
  const existing = await prisma.livestream.findFirst({
    where: { id, hostId },
  });

  if (!existing) {
    throw new Error('Livestream not found or unauthorized');
  }

  const updated = await prisma.livestream.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      scheduledAt: input.scheduledAt,
      thumbnailUrl: input.thumbnailUrl,
      category: input.category,
      tags: input.tags,
      isPublic: input.isPublic,
      allowChat: input.allowChat,
    },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, pfpUrl: true },
      },
    },
  });

  return transformLivestream(updated);
}

/**
 * Add destination to livestream
 */
export async function addDestination(
  streamId: string,
  hostId: string,
  input: AddDestinationInput
): Promise<LivestreamWithHost> {
  const stream = await prisma.livestream.findFirst({
    where: { id: streamId, hostId },
  });

  if (!stream) {
    throw new Error('Livestream not found or unauthorized');
  }

  const destinations = parseDestinations(stream.destinations);

  // Create new destination
  const newDestination: StreamDestination = {
    platform: input.platform,
    name: input.name,
    enabled: true,
    rtmpUrl: input.rtmpUrl,
    streamKey: input.streamKey,
    status: 'disconnected',
  };

  // Add to Castr if configured
  if (stream.castrStreamId && castrService.isConfigured() && input.rtmpUrl && input.streamKey) {
    try {
      await castrService.addDestination(
        stream.castrStreamId,
        input.platform,
        input.name,
        input.rtmpUrl,
        input.streamKey
      );
      newDestination.status = 'connected';
    } catch (error) {
      console.error('Failed to add Castr destination:', error);
      newDestination.status = 'error';
      newDestination.errorMessage = 'Failed to connect destination';
    }
  }

  destinations.push(newDestination);

  const updated = await prisma.livestream.update({
    where: { id: streamId },
    data: { destinations: destinations as unknown as Prisma.InputJsonValue },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, pfpUrl: true },
      },
    },
  });

  return transformLivestream(updated);
}

/**
 * Remove destination from livestream
 */
export async function removeDestination(
  streamId: string,
  hostId: string,
  platform: StreamPlatform
): Promise<LivestreamWithHost> {
  const stream = await prisma.livestream.findFirst({
    where: { id: streamId, hostId },
  });

  if (!stream) {
    throw new Error('Livestream not found or unauthorized');
  }

  const destinations = parseDestinations(stream.destinations)
    .filter((d) => d.platform !== platform);

  const updated = await prisma.livestream.update({
    where: { id: streamId },
    data: { destinations: destinations as unknown as Prisma.InputJsonValue },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, pfpUrl: true },
      },
    },
  });

  return transformLivestream(updated);
}

/**
 * Go live - start the stream
 */
export async function goLive(streamId: string, hostId: string): Promise<LivestreamWithHost> {
  const stream = await prisma.livestream.findFirst({
    where: { id: streamId, hostId },
  });

  if (!stream) {
    throw new Error('Livestream not found or unauthorized');
  }

  if (stream.status === StreamStatus.LIVE) {
    throw new Error('Stream is already live');
  }

  // Update status to STARTING
  let updated = await prisma.livestream.update({
    where: { id: streamId },
    data: { status: StreamStatus.STARTING },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, pfpUrl: true },
      },
    },
  });

  // If Castr is configured, check stream status
  if (stream.castrStreamId && castrService.isConfigured()) {
    try {
      const status = await castrService.getStreamStatus(stream.castrStreamId);

      if (status.isLive) {
        // Stream is receiving data, mark as LIVE
        updated = await prisma.livestream.update({
          where: { id: streamId },
          data: {
            status: StreamStatus.LIVE,
            startedAt: new Date(),
          },
          include: {
            host: {
              select: { id: true, username: true, displayName: true, pfpUrl: true },
            },
          },
        });

        // Emit WebSocket event
        const io = getIO();
        if (io) {
          io.to('grid:live').emit('stream:started', {
            streamId,
            playbackUrl: stream.playbackUrl,
          });
        }
      }
    } catch (error) {
      console.error('Failed to check Castr stream status:', error);
    }
  }

  return transformLivestream(updated);
}

/**
 * End the stream
 */
export async function endStream(streamId: string, hostId: string): Promise<LivestreamWithHost> {
  const stream = await prisma.livestream.findFirst({
    where: { id: streamId, hostId },
  });

  if (!stream) {
    throw new Error('Livestream not found or unauthorized');
  }

  const startedAt = stream.startedAt || new Date();
  const endedAt = new Date();
  const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

  const updated = await prisma.livestream.update({
    where: { id: streamId },
    data: {
      status: StreamStatus.ENDED,
      endedAt,
      duration,
    },
    include: {
      host: {
        select: { id: true, username: true, displayName: true, pfpUrl: true },
      },
    },
  });

  // Emit WebSocket event
  const io = getIO();
  if (io) {
    io.to('grid:live').emit('stream:stopped', { streamId });
  }

  return transformLivestream(updated);
}

/**
 * Track viewer join
 */
export async function viewerJoined(
  streamId: string,
  sessionId: string,
  userId?: string
): Promise<number> {
  // Create viewer record
  await prisma.livestreamViewer.upsert({
    where: { streamId_sessionId: { streamId, sessionId } },
    create: { streamId, sessionId, userId },
    update: { leftAt: null, joinedAt: new Date() },
  });

  // Get current viewer count
  const count = await prisma.livestreamViewer.count({
    where: { streamId, leftAt: null },
  });

  // Update stream viewer count
  const stream = await prisma.livestream.update({
    where: { id: streamId },
    data: {
      viewerCount: count,
      totalViews: { increment: 1 },
    },
  });

  // Update peak if needed
  if (count > (stream.peakViewers || 0)) {
    await prisma.livestream.update({
      where: { id: streamId },
      data: { peakViewers: count },
    });
  }

  // Emit WebSocket event
  const io = getIO();
  if (io) {
    io.to(`stream:${streamId}`).emit('stream:viewerCount', { streamId, count });
  }

  return count;
}

/**
 * Track viewer leave
 */
export async function viewerLeft(streamId: string, sessionId: string): Promise<number> {
  const viewer = await prisma.livestreamViewer.findUnique({
    where: { streamId_sessionId: { streamId, sessionId } },
  });

  if (viewer) {
    const watchTime = Math.floor((Date.now() - viewer.joinedAt.getTime()) / 1000);

    await prisma.livestreamViewer.update({
      where: { id: viewer.id },
      data: {
        leftAt: new Date(),
        watchTime: viewer.watchTime + watchTime,
      },
    });
  }

  // Get current viewer count
  const count = await prisma.livestreamViewer.count({
    where: { streamId, leftAt: null },
  });

  // Update stream viewer count
  await prisma.livestream.update({
    where: { id: streamId },
    data: { viewerCount: count },
  });

  // Emit WebSocket event
  const io = getIO();
  if (io) {
    io.to(`stream:${streamId}`).emit('stream:viewerCount', { streamId, count });
  }

  return count;
}

/**
 * Get RTMP credentials for OBS
 */
export async function getStreamCredentials(
  streamId: string,
  hostId: string
): Promise<{ rtmpUrl: string; streamKey: string } | null> {
  const stream = await prisma.livestream.findFirst({
    where: { id: streamId, hostId },
  });

  if (!stream || !stream.castrIngestUrl || !stream.castrStreamKey) {
    return null;
  }

  return {
    rtmpUrl: stream.castrIngestUrl,
    streamKey: stream.castrStreamKey,
  };
}

/**
 * Handle Castr webhook events
 */
export async function handleCastrWebhook(payload: {
  event: string;
  stream_id: string;
  timestamp: string;
  data?: { error_message?: string; destination_name?: string };
}): Promise<void> {
  const stream = await prisma.livestream.findFirst({
    where: { castrStreamId: payload.stream_id },
  });

  if (!stream) {
    console.log('Webhook for unknown stream:', payload.stream_id);
    return;
  }

  const io = getIO();

  switch (payload.event) {
    case 'stream.started':
      await prisma.livestream.update({
        where: { id: stream.id },
        data: {
          status: StreamStatus.LIVE,
          startedAt: new Date(payload.timestamp),
        },
      });
      if (io) {
        io.to('grid:live').emit('stream:started', {
          streamId: stream.id,
          playbackUrl: stream.playbackUrl,
        });
      }
      break;

    case 'stream.stopped':
      const endedAt = new Date(payload.timestamp);
      const duration = stream.startedAt
        ? Math.floor((endedAt.getTime() - stream.startedAt.getTime()) / 1000)
        : 0;

      await prisma.livestream.update({
        where: { id: stream.id },
        data: {
          status: StreamStatus.ENDED,
          endedAt,
          duration,
        },
      });
      if (io) {
        io.to('grid:live').emit('stream:stopped', { streamId: stream.id });
      }
      break;

    case 'stream.error':
      await prisma.livestream.update({
        where: { id: stream.id },
        data: { status: StreamStatus.ERROR },
      });
      if (io) {
        io.to(`stream:${stream.id}`).emit('stream:error', {
          streamId: stream.id,
          message: payload.data?.error_message || 'Stream error',
        });
      }
      break;

    case 'destination.connected':
    case 'destination.disconnected':
      // Update destination status in the JSON array
      const destinations = parseDestinations(stream.destinations);
      const destName = payload.data?.destination_name;
      const updatedDests = destinations.map((d) =>
        d.name === destName
          ? { ...d, status: payload.event === 'destination.connected' ? 'live' : 'disconnected' }
          : d
      );
      await prisma.livestream.update({
        where: { id: stream.id },
        data: { destinations: updatedDests as unknown as Prisma.InputJsonValue },
      });
      if (io) {
        io.to(`stream:${stream.id}`).emit('stream:destinationStatus', {
          streamId: stream.id,
          platform: destName,
          status: payload.event === 'destination.connected' ? 'live' : 'disconnected',
        });
      }
      break;
  }
}

/**
 * Delete livestream
 */
export async function deleteLivestream(streamId: string, hostId: string): Promise<void> {
  const stream = await prisma.livestream.findFirst({
    where: { id: streamId, hostId },
  });

  if (!stream) {
    throw new Error('Livestream not found or unauthorized');
  }

  // Delete from Castr
  if (stream.castrStreamId && castrService.isConfigured()) {
    try {
      await castrService.deleteStream(stream.castrStreamId);
    } catch (error) {
      console.error('Failed to delete Castr stream:', error);
    }
  }

  // Delete chat room
  if (stream.chatRoomId) {
    await prisma.chatRoom.delete({ where: { id: stream.chatRoomId } }).catch(() => {});
  }

  // Delete livestream (viewers cascade delete)
  await prisma.livestream.delete({ where: { id: streamId } });
}

export default {
  createLivestream,
  getLivestream,
  getStreams,
  updateLivestream,
  addDestination,
  removeDestination,
  goLive,
  endStream,
  viewerJoined,
  viewerLeft,
  getStreamCredentials,
  handleCastrWebhook,
  deleteLivestream,
};
