// src/routes/chat.routes.ts
// Phase 3A: Chat System API Routes
// RESTful endpoints for room management, messaging, and participants

import { Router, Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import chatService from '../services/chat.service';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['PUBLIC', 'PRIVATE', 'DIRECT', 'IDEA']).optional(),
  iconUrl: z.string().url().optional(),
  maxMembers: z.number().int().min(2).max(1000).optional(),
});

const UpdateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  slowModeDelay: z.number().int().min(0).max(300).optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  replyToId: z.string().optional(),
  attachments: z.array(z.string().url()).max(10).optional(),
  mentions: z.array(z.string()).max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const EditMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

const UpdateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MODERATOR', 'MEMBER']),
});

// ============================================
// AUTH MIDDLEWARE (simplified - expects userId in body or query)
// In production, this should verify JWT and extract user from token
// ============================================

interface AuthRequest extends Request {
  userId?: string;
}

const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Try to get userId from various sources
  const userId = req.body?.userId || req.query?.userId || req.headers['x-user-id'];
  
  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  req.userId = userId;
  next();
};

// ============================================
// ROOM ENDPOINTS
// ============================================

// GET /api/chat/rooms - List all public rooms
router.get('/rooms', asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const cursor = req.query.cursor as string | undefined;
  
  const result = await chatService.listRooms({
    type: type as any,
    limit,
    cursor,
    activeOnly: true,
  });
  
  res.json(result);
}));

// GET /api/chat/rooms/my - Get rooms user has joined
router.get('/rooms/my', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const rooms = await chatService.getUserRooms(req.userId!);
  res.json({ rooms });
}));

// POST /api/chat/rooms - Create a new room
router.post('/rooms', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = CreateRoomSchema.parse(req.body);
  
  const room = await chatService.createRoom({
    ...input,
    createdById: req.userId!,
  });
  
  res.status(201).json(room);
}));

// GET /api/chat/rooms/:slug - Get room by slug
router.get('/rooms/:slug', asyncHandler(async (req: Request, res: Response) => {
  const room = await chatService.getRoomBySlug(req.params.slug);
  
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  
  res.json(room);
}));

// PATCH /api/chat/rooms/:roomId - Update room settings
router.patch('/rooms/:roomId', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const updates = UpdateRoomSchema.parse(req.body);
  
  try {
    const room = await chatService.updateRoom(req.params.roomId, req.userId!, updates);
    res.json(room);
  } catch (error: any) {
    if (error.message === 'Permission denied') {
      res.status(403).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

// DELETE /api/chat/rooms/:roomId - Delete room
router.delete('/rooms/:roomId', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    await chatService.deleteRoom(req.params.roomId, req.userId!);
    res.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('owner')) {
      res.status(403).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

// ============================================
// PARTICIPANT ENDPOINTS
// ============================================

// POST /api/chat/rooms/:roomId/join - Join a room
router.post('/rooms/:roomId/join', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await chatService.joinRoom(req.params.roomId, req.userId!);
  
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  
  res.json({ success: true, participant: result.participant });
}));

// POST /api/chat/rooms/:roomId/leave - Leave a room
router.post('/rooms/:roomId/leave', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    await chatService.leaveRoom(req.params.roomId, req.userId!);
    res.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('Owner')) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

// GET /api/chat/rooms/:roomId/participants - Get room participants
router.get('/rooms/:roomId/participants', asyncHandler(async (req: Request, res: Response) => {
  const participants = await chatService.getRoomParticipants(req.params.roomId);
  res.json({ participants });
}));

// PATCH /api/chat/rooms/:roomId/participants/:userId/role - Update user role
router.patch(
  '/rooms/:roomId/participants/:targetUserId/role',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { role } = UpdateRoleSchema.parse(req.body);
    
    try {
      await chatService.updateParticipantRole(
        req.params.roomId,
        req.params.targetUserId,
        role,
        req.userId!
      );
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('Permission') || error.message.includes('owner')) {
        res.status(403).json({ error: error.message });
        return;
      }
      throw error;
    }
  })
);

// POST /api/chat/rooms/:roomId/participants/:userId/ban - Ban user
router.post(
  '/rooms/:roomId/participants/:targetUserId/ban',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await chatService.banUser(req.params.roomId, req.params.targetUserId, req.userId!);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('Permission') || error.message.includes('Cannot ban')) {
        res.status(403).json({ error: error.message });
        return;
      }
      throw error;
    }
  })
);

// ============================================
// MESSAGE ENDPOINTS
// ============================================

// GET /api/chat/rooms/:roomId/messages - Get messages with pagination
router.get('/rooms/:roomId/messages', asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const cursor = req.query.cursor as string | undefined;
  
  const result = await chatService.getMessages(req.params.roomId, { limit, cursor });
  res.json(result);
}));

// POST /api/chat/rooms/:roomId/messages - Send a message
router.post('/rooms/:roomId/messages', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = SendMessageSchema.parse(req.body);
  
  try {
    const message = await chatService.sendMessage({
      ...input,
      roomId: req.params.roomId,
      authorId: req.userId!,
    });
    res.status(201).json(message);
  } catch (error: any) {
    if (error.message.includes('banned') || error.message.includes('join')) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error.message.includes('Slow mode')) {
      res.status(429).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

// GET /api/chat/rooms/:roomId/messages/pinned - Get pinned messages
router.get('/rooms/:roomId/messages/pinned', asyncHandler(async (req: Request, res: Response) => {
  const messages = await chatService.getPinnedMessages(req.params.roomId);
  res.json({ messages });
}));

// PATCH /api/chat/messages/:messageId - Edit a message
router.patch('/messages/:messageId', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { content } = EditMessageSchema.parse(req.body);
  
  try {
    const message = await chatService.editMessage({
      messageId: req.params.messageId,
      userId: req.userId!,
      content,
    });
    res.json(message);
  } catch (error: any) {
    if (error.message.includes('own') || error.message.includes('deleted')) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error.message === 'Message not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

// DELETE /api/chat/messages/:messageId - Delete a message
router.delete('/messages/:messageId', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    await chatService.deleteMessage(req.params.messageId, req.userId!);
    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Permission denied') {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error.message === 'Message not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

// POST /api/chat/messages/:messageId/pin - Pin/unpin a message
router.post('/messages/:messageId/pin', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const pin = req.body.pin !== false; // Default to true
  
  try {
    await chatService.pinMessage(req.params.messageId, req.userId!, pin);
    res.json({ success: true, isPinned: pin });
  } catch (error: any) {
    if (error.message === 'Permission denied') {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error.message === 'Message not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

// ============================================
// READ TRACKING ENDPOINTS
// ============================================

// POST /api/chat/rooms/:roomId/read - Mark room as read
router.post('/rooms/:roomId/read', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  await chatService.markAsRead(req.params.roomId, req.userId!);
  res.json({ success: true });
}));

// GET /api/chat/unread - Get unread counts for all rooms
router.get('/unread', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const unread = await chatService.getUnreadCounts(req.userId!);
  res.json({ unread });
}));

export default router;
