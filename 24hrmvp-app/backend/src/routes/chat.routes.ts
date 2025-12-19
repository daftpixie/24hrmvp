// ============================================
// 24HRMVP - CHAT ROUTES (PRODUCTION READY)
// File: backend/src/routes/chat.routes.ts
// Phase 3A/3B: Chat System with proper JWT auth
// 
// FIXED: Using gridAuth middleware for JWT verification
// matching forum routes authentication pattern
// ============================================

import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import chatService from '../services/chat.service';
import { 
  requireAuth, 
  optionalAuth,
  getAuthUser,
} from '../middleware/gridAuth';
import { AuthRequest, isAuthenticated } from '../types/grid';

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
// PUBLIC ENDPOINTS (no auth required)
// ============================================

/**
 * GET /api/grid/chat/rooms
 * List all public rooms
 */
router.get('/rooms', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const cursor = req.query.cursor as string | undefined;
  
  const result = await chatService.listRooms({
    type: type as any,
    limit,
    cursor,
    activeOnly: true,
  });
  
  res.json({
    success: true,
    ...result,
  });
}));

/**
 * GET /api/grid/chat/rooms/:slug
 * Get room by slug (public)
 */
router.get('/rooms/:slug', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const room = await chatService.getRoomBySlug(req.params.slug);
  
  if (!room) {
    res.status(404).json({ 
      success: false,
      error: 'Not Found',
      message: 'Room not found',
    });
    return;
  }
  
  res.json({
    success: true,
    room,
  });
}));

/**
 * GET /api/grid/chat/rooms/:roomId/messages
 * Get messages with pagination (public read)
 */
router.get('/rooms/:roomId/messages', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const cursor = req.query.cursor as string | undefined;
  
  const result = await chatService.getMessages(req.params.roomId, { limit, cursor });
  res.json({
    success: true,
    ...result,
  });
}));

/**
 * GET /api/grid/chat/rooms/:roomId/participants
 * Get room participants (public)
 */
router.get('/rooms/:roomId/participants', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const participants = await chatService.getRoomParticipants(req.params.roomId);
  res.json({
    success: true,
    participants,
  });
}));

/**
 * GET /api/grid/chat/rooms/:roomId/messages/pinned
 * Get pinned messages (public)
 */
router.get('/rooms/:roomId/messages/pinned', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const messages = await chatService.getPinnedMessages(req.params.roomId);
  res.json({
    success: true,
    messages,
  });
}));

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * GET /api/grid/chat/rooms/my
 * Get rooms user has joined
 */
router.get(
  '/rooms/my',
  ...requireAuth(async (req, res) => {
    const rooms = await chatService.getUserRooms(req.user!.id);
    res.json({
      success: true,
      rooms,
    });
  })
);

/**
 * POST /api/grid/chat/rooms
 * Create a new room
 */
router.post(
  '/rooms',
  ...requireAuth(async (req, res) => {
    try {
      const input = CreateRoomSchema.parse(req.body);
      
      const room = await chatService.createRoom({
        ...input,
        createdById: req.user!.id,
      });
      
      res.status(201).json({
        success: true,
        room,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid input data',
          details: error.errors,
        });
        return;
      }
      throw error;
    }
  })
);

/**
 * PATCH /api/grid/chat/rooms/:roomId
 * Update room settings
 */
router.patch(
  '/rooms/:roomId',
  ...requireAuth(async (req, res) => {
    try {
      const updates = UpdateRoomSchema.parse(req.body);
      const room = await chatService.updateRoom(req.params.roomId, req.user!.id, updates);
      
      res.json({
        success: true,
        room,
      });
    } catch (error: any) {
      if (error.message === 'Permission denied') {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to update this room',
        });
        return;
      }
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid input data',
          details: error.errors,
        });
        return;
      }
      throw error;
    }
  })
);

/**
 * DELETE /api/grid/chat/rooms/:roomId
 * Delete room
 */
router.delete(
  '/rooms/:roomId',
  ...requireAuth(async (req, res) => {
    try {
      await chatService.deleteRoom(req.params.roomId, req.user!.id);
      res.json({
        success: true,
        message: 'Room deleted successfully',
      });
    } catch (error: any) {
      if (error.message.includes('owner')) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: error.message,
        });
        return;
      }
      throw error;
    }
  })
);

// ============================================
// PARTICIPANT ENDPOINTS
// ============================================

/**
 * POST /api/grid/chat/rooms/:roomId/join
 * Join a room
 */
router.post(
  '/rooms/:roomId/join',
  ...requireAuth(async (req, res) => {
    const result = await chatService.joinRoom(req.params.roomId, req.user!.id);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: result.error,
      });
      return;
    }
    
    res.json({
      success: true,
      participant: result.participant,
    });
  })
);

/**
 * POST /api/grid/chat/rooms/:roomId/leave
 * Leave a room
 */
router.post(
  '/rooms/:roomId/leave',
  ...requireAuth(async (req, res) => {
    try {
      await chatService.leaveRoom(req.params.roomId, req.user!.id);
      res.json({
        success: true,
        message: 'Left room successfully',
      });
    } catch (error: any) {
      if (error.message.includes('Owner')) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: error.message,
        });
        return;
      }
      throw error;
    }
  })
);

/**
 * PATCH /api/grid/chat/rooms/:roomId/participants/:targetUserId/role
 * Update user role
 */
router.patch(
  '/rooms/:roomId/participants/:targetUserId/role',
  ...requireAuth(async (req, res) => {
    try {
      const { role } = UpdateRoleSchema.parse(req.body);
      
      await chatService.updateParticipantRole(
        req.params.roomId,
        req.params.targetUserId,
        role,
        req.user!.id
      );
      
      res.json({
        success: true,
        message: 'Role updated successfully',
      });
    } catch (error: any) {
      if (error.message.includes('Permission') || error.message.includes('owner')) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: error.message,
        });
        return;
      }
      throw error;
    }
  })
);

/**
 * POST /api/grid/chat/rooms/:roomId/participants/:targetUserId/ban
 * Ban user from room
 */
router.post(
  '/rooms/:roomId/participants/:targetUserId/ban',
  ...requireAuth(async (req, res) => {
    try {
      await chatService.banUser(req.params.roomId, req.params.targetUserId, req.user!.id);
      res.json({
        success: true,
        message: 'User banned successfully',
      });
    } catch (error: any) {
      if (error.message.includes('Permission') || error.message.includes('Cannot ban')) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: error.message,
        });
        return;
      }
      throw error;
    }
  })
);

// ============================================
// MESSAGE ENDPOINTS
// ============================================

/**
 * POST /api/grid/chat/rooms/:roomId/messages
 * Send a message
 */
router.post(
  '/rooms/:roomId/messages',
  ...requireAuth(async (req, res) => {
    try {
      const input = SendMessageSchema.parse(req.body);
      
      const message = await chatService.sendMessage({
        ...input,
        roomId: req.params.roomId,
        authorId: req.user!.id,
      });
      
      res.status(201).json({
        success: true,
        message,
      });
    } catch (error: any) {
      if (error.message.includes('banned') || error.message.includes('join')) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: error.message,
        });
        return;
      }
      if (error.message.includes('Slow mode')) {
        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: error.message,
        });
        return;
      }
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid message data',
          details: error.errors,
        });
        return;
      }
      throw error;
    }
  })
);

/**
 * PATCH /api/grid/chat/messages/:messageId
 * Edit a message
 */
router.patch(
  '/messages/:messageId',
  ...requireAuth(async (req, res) => {
    try {
      const { content } = EditMessageSchema.parse(req.body);
      
      const message = await chatService.editMessage({
        messageId: req.params.messageId,
        userId: req.user!.id,
        content,
      });
      
      res.json({
        success: true,
        message,
      });
    } catch (error: any) {
      if (error.message.includes('own') || error.message.includes('deleted')) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: error.message,
        });
        return;
      }
      if (error.message === 'Message not found') {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: error.message,
        });
        return;
      }
      throw error;
    }
  })
);

/**
 * DELETE /api/grid/chat/messages/:messageId
 * Delete a message
 */
router.delete(
  '/messages/:messageId',
  ...requireAuth(async (req, res) => {
    try {
      await chatService.deleteMessage(req.params.messageId, req.user!.id);
      res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error: any) {
      if (error.message === 'Permission denied') {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to delete this message',
        });
        return;
      }
      if (error.message === 'Message not found') {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: error.message,
        });
        return;
      }
      throw error;
    }
  })
);

/**
 * POST /api/grid/chat/messages/:messageId/pin
 * Pin/unpin a message
 */
router.post(
  '/messages/:messageId/pin',
  ...requireAuth(async (req, res) => {
    try {
      const pin = req.body.pin !== false; // Default to true
      
      await chatService.pinMessage(req.params.messageId, req.user!.id, pin);
      res.json({
        success: true,
        isPinned: pin,
        message: pin ? 'Message pinned successfully' : 'Message unpinned successfully',
      });
    } catch (error: any) {
      if (error.message === 'Permission denied') {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to pin messages',
        });
        return;
      }
      if (error.message === 'Message not found') {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: error.message,
        });
        return;
      }
      throw error;
    }
  })
);

// ============================================
// READ TRACKING ENDPOINTS
// ============================================

/**
 * POST /api/grid/chat/rooms/:roomId/read
 * Mark room as read
 */
router.post(
  '/rooms/:roomId/read',
  ...requireAuth(async (req, res) => {
    await chatService.markAsRead(req.params.roomId, req.user!.id);
    res.json({
      success: true,
      message: 'Room marked as read',
    });
  })
);

/**
 * GET /api/grid/chat/unread
 * Get unread counts for all rooms
 */
router.get(
  '/unread',
  ...requireAuth(async (req, res) => {
    const unread = await chatService.getUnreadCounts(req.user!.id);
    res.json({
      success: true,
      unread,
    });
  })
);

export default router;
