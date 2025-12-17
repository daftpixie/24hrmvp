"use strict";
// ============================================
// 24HRMVP - WEBSOCKET SERVICE
// File: backend/src/services/websocket.ts
// Phase 2: Real-time features for The Grid
// Phase 3B: Enhanced chat with room tracking
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
exports.initWebSocket = initWebSocket;
exports.emitToRoom = emitToRoom;
exports.emitToUser = emitToUser;
exports.emitForumVoteUpdate = emitForumVoteUpdate;
exports.emitNewForumPost = emitNewForumPost;
exports.emitChatMessage = emitChatMessage;
exports.emitChatMessageEdited = emitChatMessageEdited;
exports.emitChatMessageDeleted = emitChatMessageDeleted;
exports.emitChatMessagePinned = emitChatMessagePinned;
exports.emitNotification = emitNotification;
exports.getOnlineCount = getOnlineCount;
exports.getRoomOnlineCount = getRoomOnlineCount;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("./redis");
let io;
// Track online users in memory
const onlineUsers = new Map();
// Phase 3B: Track users in chat rooms (for online count per room)
const roomUsers = new Map(); // roomId -> Set of socketIds
// ============================================
// SOCKET.IO INITIALIZATION
// ============================================
function initWebSocket(server) {
    exports.io = io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || [
                'http://localhost:3000',
                'https://24hrmvp.xyz',
                'https://www.24hrmvp.xyz'
            ],
            credentials: true,
            methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
    });
    // Phase 3B: Setup Redis adapter for horizontal scaling (if available)
    setupRedisAdapter();
    // Setup Redis pub/sub for scaling
    setupRedisSubscriptions();
    // Handle connections
    io.on('connection', handleConnection);
    console.log('✓ WebSocket server initialized (Phase 3B)');
    return io;
}
// ============================================
// PHASE 3B: REDIS ADAPTER SETUP
// ============================================
function setupRedisAdapter() {
    try {
        if ((0, redis_1.isRedisConnected)() && redis_1.publisher && redis_1.subscriber) {
            io.adapter((0, redis_adapter_1.createAdapter)(redis_1.publisher, redis_1.subscriber));
            console.log('  ✓ Socket.io Redis adapter enabled (horizontal scaling ready)');
        }
        else {
            console.log('  ℹ Socket.io using memory adapter (single instance mode)');
        }
    }
    catch (error) {
        console.log('  ℹ Redis adapter setup failed, using memory adapter');
    }
}
// ============================================
// REDIS PUB/SUB SETUP
// ============================================
function setupRedisSubscriptions() {
    try {
        if (!redis_1.subscriber) {
            console.log('  ℹ No Redis subscriber, skipping pub/sub setup');
            return;
        }
        // Subscribe to Grid channels
        redis_1.subscriber.subscribe('grid:forum:votes', 'grid:forum:posts', 'grid:chat', 'grid:chat:edited', 'grid:chat:deleted', 'grid:chat:pinned', 'grid:presence', 'grid:notifications');
        redis_1.subscriber.on('message', (channel, message) => {
            try {
                const data = JSON.parse(message);
                switch (channel) {
                    case 'grid:forum:votes':
                        io.to('grid:forum').emit('forum:voteUpdate', data);
                        if (data.postSlug) {
                            io.to(`post:${data.postSlug}`).emit('forum:voteUpdate', data);
                        }
                        break;
                    case 'grid:forum:posts':
                        io.to('grid:forum').emit('forum:newPost', data);
                        break;
                    case 'grid:chat':
                        if (data.roomId) {
                            io.to(`chat:${data.roomId}`).emit('chat:message', data);
                        }
                        break;
                    case 'grid:chat:edited':
                        if (data.roomId) {
                            io.to(`chat:${data.roomId}`).emit('chat:messageEdited', data);
                        }
                        break;
                    case 'grid:chat:deleted':
                        if (data.roomId) {
                            io.to(`chat:${data.roomId}`).emit('chat:messageDeleted', data);
                        }
                        break;
                    case 'grid:chat:pinned':
                        if (data.roomId) {
                            io.to(`chat:${data.roomId}`).emit('chat:messagePinned', data);
                        }
                        break;
                    case 'grid:presence':
                        io.to('grid:presence').emit('presence:update', data);
                        break;
                    case 'grid:notifications':
                        if (data.userId) {
                            io.to(`user:${data.userId}`).emit('notification:new', data);
                        }
                        break;
                }
            }
            catch (err) {
                console.error('[WS] Error parsing Redis message:', err);
            }
        });
        console.log('  ✓ Redis pub/sub subscriptions active');
    }
    catch (error) {
        console.log('  ℹ Redis pub/sub unavailable, using direct emit only');
    }
}
// ============================================
// CONNECTION HANDLER
// ============================================
function handleConnection(socket) {
    console.log(`[WS] Client connected: ${socket.id}`);
    // ----------------------------------------
    // AUTHENTICATION
    // ----------------------------------------
    socket.on('auth:login', async (data) => {
        socket.data.userId = data.userId;
        socket.data.username = data.username;
        // Track online status
        onlineUsers.set(socket.id, { userId: data.userId, username: data.username, connectedAt: new Date() });
        // Join personal notification room
        socket.join(`user:${data.userId}`);
        // Broadcast presence
        broadcastPresence('online', data.userId, data.username);
        socket.emit('auth:success', { message: 'Authenticated', userId: data.userId });
        console.log(`[WS] User authenticated: ${data.username} (${data.userId})`);
    });
    // ----------------------------------------
    // ROOM MANAGEMENT
    // ----------------------------------------
    socket.on('grid:join', (room) => {
        socket.join(room);
        console.log(`[WS] ${socket.id} joined ${room}`);
        socket.emit('grid:joined', { room });
    });
    socket.on('grid:leave', (room) => {
        socket.leave(room);
        console.log(`[WS] ${socket.id} left ${room}`);
    });
    // Join specific post room for live updates
    socket.on('post:join', (slug) => {
        socket.join(`post:${slug}`);
    });
    socket.on('post:leave', (slug) => {
        socket.leave(`post:${slug}`);
    });
    // ----------------------------------------
    // FORUM REAL-TIME EVENTS
    // ----------------------------------------
    socket.on('forum:vote', async (data) => {
        const update = {
            postId: data.postId,
            userId: data.userId,
            value: data.value,
            timestamp: new Date().toISOString()
        };
        // Direct emit
        io.to('grid:forum').emit('forum:voteUpdate', update);
        io.to(`post:${data.postId}`).emit('forum:voteUpdate', update);
        // Publish to Redis for multi-server
        publishToRedis('grid:forum:votes', update);
    });
    socket.on('forum:newPost', (data) => {
        io.to('grid:forum').emit('forum:newPost', data);
        publishToRedis('grid:forum:posts', data);
    });
    // ----------------------------------------
    // CHAT EVENTS (Phase 3B Enhanced)
    // ----------------------------------------
    socket.on('chat:join', (roomId) => {
        const roomKey = `chat:${roomId}`;
        socket.join(roomKey);
        // Phase 3B: Track user in room for online count
        if (!roomUsers.has(roomId)) {
            roomUsers.set(roomId, new Set());
        }
        roomUsers.get(roomId).add(socket.id);
        const onlineCount = roomUsers.get(roomId)?.size || 1;
        // Notify room of new user (if authenticated)
        if (socket.data.userId) {
            socket.to(roomKey).emit('chat:userJoined', {
                roomId,
                user: {
                    id: socket.data.userId,
                    username: socket.data.username,
                },
                timestamp: new Date().toISOString()
            });
        }
        // Send room info to joining user
        socket.emit('chat:roomInfo', { roomId, onlineCount });
        console.log(`[WS] ${socket.data.username || socket.id} joined chat:${roomId} (${onlineCount} online)`);
    });
    socket.on('chat:leave', (roomId) => {
        const roomKey = `chat:${roomId}`;
        socket.leave(roomKey);
        // Phase 3B: Remove from room tracking
        roomUsers.get(roomId)?.delete(socket.id);
        // Notify room of user leaving
        if (socket.data.userId) {
            io.to(roomKey).emit('chat:userLeft', {
                roomId,
                userId: socket.data.userId,
                timestamp: new Date().toISOString()
            });
        }
        console.log(`[WS] ${socket.data.username || socket.id} left chat:${roomId}`);
    });
    socket.on('chat:message', async (data) => {
        if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
        }
        // Phase 3B: Use chat service for persistence + broadcast
        try {
            const chatService = await Promise.resolve().then(() => __importStar(require('./chat.service')));
            const message = await chatService.sendMessage({
                roomId: data.roomId,
                authorId: socket.data.userId,
                content: data.content,
            });
            console.log(`[WS] Message sent via WebSocket: ${message.id}`);
        }
        catch (error) {
            // Fallback to simple broadcast if service fails
            const message = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                roomId: data.roomId,
                userId: socket.data.userId,
                username: socket.data.username,
                content: data.content,
                timestamp: new Date().toISOString()
            };
            io.to(`chat:${data.roomId}`).emit('chat:message', message);
            publishToRedis('grid:chat', message);
        }
    });
    socket.on('chat:typing', (data) => {
        if (!socket.data.userId)
            return;
        socket.to(`chat:${data.roomId}`).emit('chat:typing', {
            roomId: data.roomId,
            userId: socket.data.userId,
            username: socket.data.username,
            isTyping: data.isTyping
        });
    });
    // ----------------------------------------
    // PRESENCE
    // ----------------------------------------
    socket.on('presence:ping', () => {
        if (socket.data.userId) {
            onlineUsers.set(socket.id, {
                userId: socket.data.userId,
                username: socket.data.username,
                connectedAt: onlineUsers.get(socket.id)?.connectedAt || new Date()
            });
        }
    });
    socket.on('presence:getOnline', () => {
        const users = Array.from(onlineUsers.values());
        socket.emit('presence:onlineUsers', users);
    });
    // ----------------------------------------
    // DISCONNECT
    // ----------------------------------------
    socket.on('disconnect', (reason) => {
        console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
        // Phase 3B: Remove from all room tracking
        roomUsers.forEach((users, roomId) => {
            if (users.has(socket.id)) {
                users.delete(socket.id);
                // Notify room of user leaving
                if (socket.data.userId) {
                    io.to(`chat:${roomId}`).emit('chat:userLeft', {
                        roomId,
                        userId: socket.data.userId,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });
        if (socket.data.userId) {
            broadcastPresence('offline', socket.data.userId, socket.data.username);
        }
        onlineUsers.delete(socket.id);
    });
}
// ============================================
// HELPER FUNCTIONS
// ============================================
function broadcastPresence(status, userId, username) {
    const data = { userId, username, status, timestamp: new Date().toISOString() };
    io.to('grid:presence').emit('presence:update', data);
    publishToRedis('grid:presence', data);
}
function publishToRedis(channel, data) {
    try {
        redis_1.publisher?.publish(channel, JSON.stringify(data));
    }
    catch (error) {
        // Silent fail - direct emit already handled
    }
}
// ============================================
// EXPORTED UTILITIES
// ============================================
function emitToRoom(room, event, data) {
    if (io) {
        io.to(room).emit(event, data);
    }
}
function emitToUser(userId, event, data) {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
}
function emitForumVoteUpdate(postId, postSlug, upvotes, downvotes, score) {
    const data = { postId, postSlug, upvotes, downvotes, score, timestamp: new Date().toISOString() };
    if (io) {
        io.to('grid:forum').emit('forum:voteUpdate', data);
        io.to(`post:${postSlug}`).emit('forum:voteUpdate', data);
    }
    publishToRedis('grid:forum:votes', data);
}
function emitNewForumPost(post) {
    if (io) {
        io.to('grid:forum').emit('forum:newPost', { post });
    }
    publishToRedis('grid:forum:posts', { post });
}
// Phase 3B: Chat emission utilities
function emitChatMessage(roomId, message) {
    if (io) {
        io.to(`chat:${roomId}`).emit('chat:message', message);
    }
    publishToRedis('grid:chat', { ...message, roomId });
}
function emitChatMessageEdited(roomId, message) {
    if (io) {
        io.to(`chat:${roomId}`).emit('chat:messageEdited', message);
    }
    publishToRedis('grid:chat:edited', { ...message, roomId });
}
function emitChatMessageDeleted(roomId, messageId) {
    const data = { messageId, roomId };
    if (io) {
        io.to(`chat:${roomId}`).emit('chat:messageDeleted', data);
    }
    publishToRedis('grid:chat:deleted', data);
}
function emitChatMessagePinned(roomId, messageId, isPinned) {
    const data = { messageId, roomId, isPinned };
    if (io) {
        io.to(`chat:${roomId}`).emit('chat:messagePinned', data);
    }
    publishToRedis('grid:chat:pinned', data);
}
function emitNotification(userId, notification) {
    const payload = { ...notification, timestamp: new Date().toISOString() };
    if (io) {
        io.to(`user:${userId}`).emit('notification:new', payload);
    }
    publishToRedis('grid:notifications', { userId, ...payload });
}
function getOnlineCount() {
    return onlineUsers.size;
}
// Phase 3B: Get room-specific online count
function getRoomOnlineCount(roomId) {
    return roomUsers.get(roomId)?.size || 0;
}
function getIO() {
    return io;
}
//# sourceMappingURL=websocket.js.map