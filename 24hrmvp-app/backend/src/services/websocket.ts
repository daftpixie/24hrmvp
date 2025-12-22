// ============================================
// 24HRMVP - WEBSOCKET SERVICE (PRODUCTION READY)
// File: backend/src/services/websocket.ts
// FIXED: JWT authentication for socket connections
// Phase 3B: Real-time features for The Grid
// ============================================

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { publisher, subscriber, isRedisConnected } from './redis';
import { prisma } from '../db/client';

let io: SocketIOServer;

// Track online users in memory
const onlineUsers = new Map<string, { userId: string; username: string; connectedAt: Date }>();

// Track users in chat rooms (for online count per room)
const roomUsers = new Map<string, Set<string>>(); // roomId -> Set of socketIds

// ============================================
// JWT VERIFICATION
// ============================================

interface JWTPayload {
  userId: string;
  fid?: number;
  username?: string;
  iat?: number;
  exp?: number;
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[WS] JWT_SECRET not configured');
      return null;
    }
    
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('[WS] Token verification failed:', error);
    return null;
  }
}

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

  // Setup Redis adapter for horizontal scaling (if available)
  setupRedisAdapter();

  // Setup Redis pub/sub for scaling
  setupRedisSubscriptions();

  // Handle connections
  io.on('connection', handleConnection);

  console.log('✓ WebSocket server initialized (Phase 3B - JWT Auth)');
  return io;
}

// ============================================
// REDIS ADAPTER SETUP
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
  // AUTHENTICATION (FIXED: JWT verification)
  // ----------------------------------------
  socket.on('auth:login', async (data: { token?: string; userId?: string; username?: string }) => {
    try {
      let userId: string;
      let username: string;
      
      // Prefer token-based authentication
      if (data.token) {
        const payload = await verifyToken(data.token);
        
        if (!payload || !payload.userId) {
          socket.emit('auth:error', { message: 'Invalid or expired token' });
          console.log(`[WS] Auth failed for socket ${socket.id}: Invalid token`);
          return;
        }
        
        userId = payload.userId;
        
        // Fetch username from database if not in token
        if (payload.username) {
          username = payload.username;
        } else {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true }
          });
          username = user?.username || 'Anonymous';
        }
      } else if (data.userId) {
        // Fallback: Allow userId/username for development
        // In production, this should require token validation
        if (process.env.NODE_ENV === 'production') {
          socket.emit('auth:error', { message: 'Token required for authentication' });
          console.log(`[WS] Auth rejected for socket ${socket.id}: Token required in production`);
          return;
        }
        
        userId = data.userId;
        username = data.username || 'Anonymous';
        console.log(`[WS] Warning: Non-token auth used for ${userId} (dev mode only)`);
      } else {
        socket.emit('auth:error', { message: 'No authentication credentials provided' });
        return;
      }
      
      // Store user data on socket
      socket.data.userId = userId;
      socket.data.username = username;
      socket.data.authenticated = true;
      
      // Track online status
      onlineUsers.set(socket.id, { 
        userId, 
        username, 
        connectedAt: new Date() 
      });
      
      // Join personal notification room
      socket.join(`user:${userId}`);
      
      // Broadcast presence
      broadcastPresence('online', userId, username);
      
      socket.emit('auth:success', { 
        message: 'Authenticated', 
        userId,
        username 
      });
      
      console.log(`[WS] User authenticated: ${username} (${userId})`);
    } catch (error) {
      console.error('[WS] Auth error:', error);
      socket.emit('auth:error', { message: 'Authentication failed' });
    }
  });

  // ----------------------------------------
  // ROOM MANAGEMENT (Grid)
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

  // ----------------------------------------
  // FORUM: Post room management
  // ----------------------------------------
  socket.on('post:join', (slug: string) => {
    socket.join(`post:${slug}`);
    console.log(`[WS] ${socket.id} joined post:${slug}`);
  });

  socket.on('post:leave', (slug: string) => {
    socket.leave(`post:${slug}`);
    console.log(`[WS] ${socket.id} left post:${slug}`);
  });

  // ----------------------------------------
  // FORUM: Real-time vote updates
  // ----------------------------------------
  socket.on('forum:vote', async (data: { postId: string; value: number }) => {
    // Ensure user is authenticated
    if (!socket.data.authenticated) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }
    
    const userId = socket.data.userId;
    
    // Note: The actual vote is processed via HTTP API
    // This event is for real-time broadcasting
    try {
      const post = await prisma.forumPost.findUnique({
        where: { id: data.postId },
        select: { slug: true, score: true }
      });
      
      if (post) {
        // Publish to Redis for distribution
        if (publisher) {
          publisher.publish('grid:forum:votes', JSON.stringify({
            postId: data.postId,
            postSlug: post.slug,
            score: post.score,
            userId,
            value: data.value
          }));
        }
        
        // Also emit directly for single-instance setups
        io.to(`post:${post.slug}`).emit('forum:voteUpdate', {
          postId: data.postId,
          score: post.score
        });
      }
    } catch (error) {
      console.error('[WS] Forum vote broadcast error:', error);
    }
  });

  // ----------------------------------------
  // CHAT: Room management
  // ----------------------------------------
  socket.on('chat:join', async (data: { roomId: string }) => {
    if (!socket.data.authenticated) {
      socket.emit('error', { message: 'Authentication required to join chat' });
      return;
    }
    
    const roomKey = `chat:${data.roomId}`;
    socket.join(roomKey);
    
    // Track user in room
    if (!roomUsers.has(data.roomId)) {
      roomUsers.set(data.roomId, new Set());
    }
    roomUsers.get(data.roomId)!.add(socket.id);
    
    // Broadcast join to room
    socket.to(roomKey).emit('chat:userJoined', {
      userId: socket.data.userId,
      username: socket.data.username,
      onlineCount: roomUsers.get(data.roomId)!.size
    });
    
    socket.emit('chat:joined', { 
      roomId: data.roomId,
      onlineCount: roomUsers.get(data.roomId)!.size
    });
    
    console.log(`[WS] ${socket.data.username} joined chat:${data.roomId}`);
  });

  socket.on('chat:leave', (data: { roomId: string }) => {
    const roomKey = `chat:${data.roomId}`;
    socket.leave(roomKey);
    
    // Remove from tracking
    if (roomUsers.has(data.roomId)) {
      roomUsers.get(data.roomId)!.delete(socket.id);
      
      // Broadcast leave to room
      socket.to(roomKey).emit('chat:userLeft', {
        userId: socket.data.userId,
        username: socket.data.username,
        onlineCount: roomUsers.get(data.roomId)!.size
      });
    }
    
    console.log(`[WS] ${socket.data.username || socket.id} left chat:${data.roomId}`);
  });

  // ----------------------------------------
  // CHAT: Message broadcasting (from API)
  // ----------------------------------------
  socket.on('chat:message', (data: { roomId: string; message: any }) => {
    if (!socket.data.authenticated) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }
    
    // Broadcast message to room (excluding sender - they already have it)
    socket.to(`chat:${data.roomId}`).emit('chat:message', data.message);
    
    // Publish to Redis for multi-instance
    if (publisher) {
      publisher.publish('grid:chat', JSON.stringify({
        roomId: data.roomId,
        ...data.message
      }));
    }
  });

  // ----------------------------------------
  // TYPING INDICATORS
  // ----------------------------------------
  socket.on('chat:typing', (data: { roomId: string }) => {
    if (!socket.data.authenticated) return;
    
    socket.to(`chat:${data.roomId}`).emit('chat:typing', {
      userId: socket.data.userId,
      username: socket.data.username
    });
  });

  socket.on('chat:stopTyping', (data: { roomId: string }) => {
    if (!socket.data.authenticated) return;
    
    socket.to(`chat:${data.roomId}`).emit('chat:stopTyping', {
      userId: socket.data.userId
    });
  });

  // ----------------------------------------
  // DISCONNECT HANDLER
  // ----------------------------------------
  socket.on('disconnect', () => {
    const userData = onlineUsers.get(socket.id);
    
    if (userData) {
      onlineUsers.delete(socket.id);
      broadcastPresence('offline', userData.userId, userData.username);
      
      // Clean up room tracking
      for (const [roomId, users] of roomUsers.entries()) {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          
          // Broadcast user left to room
          io.to(`chat:${roomId}`).emit('chat:userLeft', {
            userId: userData.userId,
            username: userData.username,
            onlineCount: users.size
          });
        }
      }
      
      console.log(`[WS] User disconnected: ${userData.username} (${userData.userId})`);
    } else {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    }
  });
}

// ============================================
// PRESENCE BROADCASTING
// ============================================

function broadcastPresence(status: 'online' | 'offline', userId: string, username: string) {
  const payload = {
    userId,
    username,
    status,
    timestamp: new Date().toISOString()
  };
  
  // Publish to Redis
  if (publisher) {
    publisher.publish('grid:presence', JSON.stringify(payload));
  }
  
  // Emit to presence room
  io.to('grid:presence').emit('presence:update', payload);
}

// ============================================
// EXPORTS FOR USE IN OTHER SERVICES
// ============================================

export function getIO(): SocketIOServer | null {
  return io;
}

export function getOnlineUsers(): Map<string, { userId: string; username: string; connectedAt: Date }> {
  return onlineUsers;
}

export function getRoomUsers(roomId: string): Set<string> | undefined {
  return roomUsers.get(roomId);
}

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

// Broadcast chat message (called from chat routes after DB write)
export function broadcastChatMessage(roomId: string, message: any) {
  if (io) {
    io.to(`chat:${roomId}`).emit('chat:message', message);
  }
  
  if (publisher) {
    publisher.publish('grid:chat', JSON.stringify({ roomId, ...message }));
  }
}

// Broadcast forum post update
export function broadcastForumUpdate(postSlug: string, data: any) {
  if (io) {
    io.to(`post:${postSlug}`).emit('forum:update', data);
    io.to('grid:forum').emit('forum:update', data);
  }
  
  if (publisher) {
    publisher.publish('grid:forum:posts', JSON.stringify({ postSlug, ...data }));
  }
}
