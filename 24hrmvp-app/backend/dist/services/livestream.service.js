"use strict";
// ============================================================================
// 24HRMVP Phase 4: Livestream Service
// backend/src/services/livestream.service.ts
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLivestream = createLivestream;
exports.getLivestream = getLivestream;
exports.getStreams = getStreams;
exports.updateLivestream = updateLivestream;
exports.addDestination = addDestination;
exports.removeDestination = removeDestination;
exports.goLive = goLive;
exports.endStream = endStream;
exports.viewerJoined = viewerJoined;
exports.viewerLeft = viewerLeft;
exports.getStreamCredentials = getStreamCredentials;
exports.handleCastrWebhook = handleCastrWebhook;
exports.deleteLivestream = deleteLivestream;
const client_1 = require("@prisma/client");
const castr_service_1 = require("./castr.service");
const websocket_1 = require("./websocket");
const prisma = new client_1.PrismaClient();
// Helper to parse JSON destinations safely
function parseDestinations(destinations) {
    if (!destinations)
        return [];
    if (typeof destinations === 'string') {
        try {
            return JSON.parse(destinations);
        }
        catch {
            return [];
        }
    }
    if (Array.isArray(destinations)) {
        return destinations;
    }
    return [];
}
// Transform Prisma result to typed response
function transformLivestream(stream) {
    return {
        ...stream,
        destinations: parseDestinations(stream.destinations),
        status: stream.status,
    };
}
/**
 * Create a new livestream
 */
async function createLivestream(hostId, input) {
    // Create Castr stream
    let castrStream = null;
    if (castr_service_1.castrService.isConfigured()) {
        try {
            castrStream = await castr_service_1.castrService.createStream(input.title, {
                enableRecording: true,
                enableABR: false,
            });
        }
        catch (error) {
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
            status: input.scheduledAt ? client_1.StreamStatus.SCHEDULED : client_1.StreamStatus.DRAFT,
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
            destinations: [],
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
async function getLivestream(id) {
    const stream = await prisma.livestream.findUnique({
        where: { id },
        include: {
            host: {
                select: { id: true, username: true, displayName: true, pfpUrl: true },
            },
        },
    });
    if (!stream)
        return null;
    return transformLivestream(stream);
}
/**
 * Get all livestreams with filters
 */
async function getStreams(options) {
    const { status, hostId, isPublic, limit = 20, cursor } = options;
    const where = {};
    if (status?.length)
        where.status = { in: status };
    if (hostId)
        where.hostId = hostId;
    if (isPublic !== undefined)
        where.isPublic = isPublic;
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
async function updateLivestream(id, hostId, input) {
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
async function addDestination(streamId, hostId, input) {
    const stream = await prisma.livestream.findFirst({
        where: { id: streamId, hostId },
    });
    if (!stream) {
        throw new Error('Livestream not found or unauthorized');
    }
    const destinations = parseDestinations(stream.destinations);
    // Create new destination
    const newDestination = {
        platform: input.platform,
        name: input.name,
        enabled: true,
        rtmpUrl: input.rtmpUrl,
        streamKey: input.streamKey,
        status: 'disconnected',
    };
    // Add to Castr if configured
    if (stream.castrStreamId && castr_service_1.castrService.isConfigured() && input.rtmpUrl && input.streamKey) {
        try {
            await castr_service_1.castrService.addDestination(stream.castrStreamId, input.platform, input.name, input.rtmpUrl, input.streamKey);
            newDestination.status = 'connected';
        }
        catch (error) {
            console.error('Failed to add Castr destination:', error);
            newDestination.status = 'error';
            newDestination.errorMessage = 'Failed to connect destination';
        }
    }
    destinations.push(newDestination);
    const updated = await prisma.livestream.update({
        where: { id: streamId },
        data: { destinations: destinations },
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
async function removeDestination(streamId, hostId, platform) {
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
        data: { destinations: destinations },
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
async function goLive(streamId, hostId) {
    const stream = await prisma.livestream.findFirst({
        where: { id: streamId, hostId },
    });
    if (!stream) {
        throw new Error('Livestream not found or unauthorized');
    }
    if (stream.status === client_1.StreamStatus.LIVE) {
        throw new Error('Stream is already live');
    }
    // Update status to STARTING
    let updated = await prisma.livestream.update({
        where: { id: streamId },
        data: { status: client_1.StreamStatus.STARTING },
        include: {
            host: {
                select: { id: true, username: true, displayName: true, pfpUrl: true },
            },
        },
    });
    // If Castr is configured, check stream status
    if (stream.castrStreamId && castr_service_1.castrService.isConfigured()) {
        try {
            const status = await castr_service_1.castrService.getStreamStatus(stream.castrStreamId);
            if (status.isLive) {
                // Stream is receiving data, mark as LIVE
                updated = await prisma.livestream.update({
                    where: { id: streamId },
                    data: {
                        status: client_1.StreamStatus.LIVE,
                        startedAt: new Date(),
                    },
                    include: {
                        host: {
                            select: { id: true, username: true, displayName: true, pfpUrl: true },
                        },
                    },
                });
                // Emit WebSocket event
                const io = (0, websocket_1.getIO)();
                if (io) {
                    io.to('grid:live').emit('stream:started', {
                        streamId,
                        playbackUrl: stream.playbackUrl,
                    });
                }
            }
        }
        catch (error) {
            console.error('Failed to check Castr stream status:', error);
        }
    }
    return transformLivestream(updated);
}
/**
 * End the stream
 */
async function endStream(streamId, hostId) {
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
            status: client_1.StreamStatus.ENDED,
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
    const io = (0, websocket_1.getIO)();
    if (io) {
        io.to('grid:live').emit('stream:stopped', { streamId });
    }
    return transformLivestream(updated);
}
/**
 * Track viewer join
 */
async function viewerJoined(streamId, sessionId, userId) {
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
    const io = (0, websocket_1.getIO)();
    if (io) {
        io.to(`stream:${streamId}`).emit('stream:viewerCount', { streamId, count });
    }
    return count;
}
/**
 * Track viewer leave
 */
async function viewerLeft(streamId, sessionId) {
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
    const io = (0, websocket_1.getIO)();
    if (io) {
        io.to(`stream:${streamId}`).emit('stream:viewerCount', { streamId, count });
    }
    return count;
}
/**
 * Get RTMP credentials for OBS
 */
async function getStreamCredentials(streamId, hostId) {
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
async function handleCastrWebhook(payload) {
    const stream = await prisma.livestream.findFirst({
        where: { castrStreamId: payload.stream_id },
    });
    if (!stream) {
        console.log('Webhook for unknown stream:', payload.stream_id);
        return;
    }
    const io = (0, websocket_1.getIO)();
    switch (payload.event) {
        case 'stream.started':
            await prisma.livestream.update({
                where: { id: stream.id },
                data: {
                    status: client_1.StreamStatus.LIVE,
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
                    status: client_1.StreamStatus.ENDED,
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
                data: { status: client_1.StreamStatus.ERROR },
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
            const updatedDests = destinations.map((d) => d.name === destName
                ? { ...d, status: payload.event === 'destination.connected' ? 'live' : 'disconnected' }
                : d);
            await prisma.livestream.update({
                where: { id: stream.id },
                data: { destinations: updatedDests },
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
async function deleteLivestream(streamId, hostId) {
    const stream = await prisma.livestream.findFirst({
        where: { id: streamId, hostId },
    });
    if (!stream) {
        throw new Error('Livestream not found or unauthorized');
    }
    // Delete from Castr
    if (stream.castrStreamId && castr_service_1.castrService.isConfigured()) {
        try {
            await castr_service_1.castrService.deleteStream(stream.castrStreamId);
        }
        catch (error) {
            console.error('Failed to delete Castr stream:', error);
        }
    }
    // Delete chat room
    if (stream.chatRoomId) {
        await prisma.chatRoom.delete({ where: { id: stream.chatRoomId } }).catch(() => { });
    }
    // Delete livestream (viewers cascade delete)
    await prisma.livestream.delete({ where: { id: streamId } });
}
exports.default = {
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
//# sourceMappingURL=livestream.service.js.map