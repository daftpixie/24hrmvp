// ============================================
// 24HRMVP - WEBSOCKET SERVICE
// File: backend/src/services/websocket.ts
// Phase 2: Real-time features for The Grid
// Phase 3B: Enhanced chat with room tracking
// ============================================

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { publisher, subscriber, isRedisConnected } from './redis';
import { prisma } from '../db/client';

let io: SocketIOServer;

// Track online users in memory
const onlineUsers = new Map<string, { userId: string; username: string; connectedAt: Date }>();

// Phase 3B: Track users in chat rooms (for online count per room)
const roomUsers = new Map<string, Set<string>>(); // roomId -> Set of socketIds

// ============================================
// SOCKET.IO INITIALIZATION
// ============================================

export function initWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
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
    if (isRedisConnected() && publisher && subscriber) {
      io.adapter(createAdapter(publisher, subscriber));
      console.log('  ✓ Socket.io Redis adapter enabled (horizontal scaling ready)');
    } else {
      console.log('  ℹ Socket.io using memory adapter (single instance mode)');
    }
  } catch (error) {
    console.log('  ℹ Redis adapter setup failed, using memory adapter');
  }
}

// ============================================
// REDIS PUB/SUB SETUP
// ============================================

function setupRedisSubscriptions() {
  try {
    if (!subscriber) {
      console.log('  ℹ No Redis subscriber, skipping pub/sub setup');
      return;
    }
    // Subscribe to Grid channels
    subscriber.subscribe(
      'grid:forum:votes',
      'grid:forum:posts',
      'grid:chat',
      'grid:chat:edited',
      'grid:chat:deleted',
      'grid:chat:pinned',
      'grid:presence',
      'grid:notifications'
    );

    subscriber.on('message', (channel: string, message: string) => {
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
      } catch (err) {
        console.error('[WS] Error parsing Redis message:', err);
      }
    });

    console.log('  ✓ Redis pub/sub subscriptions active');
  } catch (error) {
    console.log('  ℹ Redis pub/sub unavailable, using direct emit only');
  }
}

// ============================================
// CONNECTION HANDLER
// ============================================

function handleConnection(socket: Socket) {
  console.log(`[WS] Client connected: ${socket.id}`);

  // ----------------------------------------
  // AUTHENTICATION
  // ----------------------------------------
  socket.on('auth:login', async (data: { userId: string; username: string }) => {
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
  socket.on('grid:join', (room: string) => {
    socket.join(room);
    console.log(`[WS] ${socket.id} joined ${room}`);
    socket.emit('grid:joined', { room });
  });

  socket.on('grid:leave', (room: string) => {
    socket.leave(room);
    console.log(`[WS] ${socket.id} left ${room}`);
  });

  // Join specific post room for live updates
  socket.on('post:join', (slug: string) => {
    socket.join(`post:${slug}`);
  });

  socket.on('post:leave', (slug: string) => {
    socket.leave(`post:${slug}`);
  });

  // ----------------------------------------
  // FORUM REAL-TIME EVENTS
  // ----------------------------------------
  socket.on('forum:vote', async (data: { postId: string; userId: string; value: number }) => {
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

  socket.on('forum:newPost', (data: { post: any }) => {
    io.to('grid:forum').emit('forum:newPost', data);
    publishToRedis('grid:forum:posts', data);
  });

  // ----------------------------------------
  // CHAT EVENTS (Phase 3B Enhanced)
  // ----------------------------------------
  socket.on('chat:join', (roomId: string) => {
    const roomKey = `chat:${roomId}`;
    socket.join(roomKey);
    
    // Phase 3B: Track user in room for online count
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId)!.add(socket.id);
    
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

  socket.on('chat:leave', (roomId: string) => {
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

  socket.on('chat:message', async (data: { roomId: string; content: string }) => {
    if (!socket.data.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Phase 3B: Use chat service for persistence + broadcast
    try {
      const chatService = await import('./chat.service');
      const message = await chatService.sendMessage({
        roomId: data.roomId,
        authorId: socket.data.userId,
        content: data.content,
      });
      console.log(`[WS] Message sent via WebSocket: ${message.id}`);
    } catch (error: any) {
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

  socket.on('chat:typing', (data: { roomId: string; isTyping: boolean }) => {
    if (!socket.data.userId) return;
    
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
  socket.on('disconnect', (reason: string) => {
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

function broadcastPresence(status: 'online' | 'offline', userId: string, username: string) {
  const data = { userId, username, status, timestamp: new Date().toISOString() };
  io.to('grid:presence').emit('presence:update', data);
  publishToRedis('grid:presence', data);
}

function publishToRedis(channel: string, data: any) {
  try {
    publisher?.publish(channel, JSON.stringify(data));
  } catch (error) {
    // Silent fail - direct emit already handled
  }
}

// ============================================
// EXPORTED UTILITIES
// ============================================

export function emitToRoom(room: string, event: string, data: any) {
  if (io) {
    io.to(room).emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitForumVoteUpdate(postId: string, postSlug: string, upvotes: number, downvotes: number, score: number) {
  const data = { postId, postSlug, upvotes, downvotes, score, timestamp: new Date().toISOString() };
  if (io) {
    io.to('grid:forum').emit('forum:voteUpdate', data);
    io.to(`post:${postSlug}`).emit('forum:voteUpdate', data);
  }
  publishToRedis('grid:forum:votes', data);
}

export function emitNewForumPost(post: any) {
  if (io) {
    io.to('grid:forum').emit('forum:newPost', { post });
  }
  publishToRedis('grid:forum:posts', { post });
}

// Phase 3B: Chat emission utilities
export function emitChatMessage(roomId: string, message: any) {
  if (io) {
    io.to(`chat:${roomId}`).emit('chat:message', message);
  }
  publishToRedis('grid:chat', { ...message, roomId });
}

export function emitChatMessageEdited(roomId: string, message: any) {
  if (io) {
    io.to(`chat:${roomId}`).emit('chat:messageEdited', message);
  }
  publishToRedis('grid:chat:edited', { ...message, roomId });
}

export function emitChatMessageDeleted(roomId: string, messageId: string) {
  const data = { messageId, roomId };
  if (io) {
    io.to(`chat:${roomId}`).emit('chat:messageDeleted', data);
  }
  publishToRedis('grid:chat:deleted', data);
}

export function emitChatMessagePinned(roomId: string, messageId: string, isPinned: boolean) {
  const data = { messageId, roomId, isPinned };
  if (io) {
    io.to(`chat:${roomId}`).emit('chat:messagePinned', data);
  }
  publishToRedis('grid:chat:pinned', data);
}

export function emitNotification(userId: string, notification: { type: string; title: string; message: string; data?: any }) {
  const payload = { ...notification, timestamp: new Date().toISOString() };
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', payload);
  }
  publishToRedis('grid:notifications', { userId, ...payload });
}

export function getOnlineCount(): number {
  return onlineUsers.size;
}

// Phase 3B: Get room-specific online count
export function getRoomOnlineCount(roomId: string): number {
  return roomUsers.get(roomId)?.size || 0;
}

export function getIO(): SocketIOServer {
  return io;
}

export { io };
