"use strict";
// src/routes/chat.routes.ts
// Phase 3A: Chat System API Routes
// RESTful endpoints for room management, messaging, and participants
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const zod_1 = require("zod");
const chat_service_1 = __importDefault(require("../services/chat.service"));
const router = (0, express_1.Router)();
// ============================================
// VALIDATION SCHEMAS
// ============================================
const CreateRoomSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    type: zod_1.z.enum(['PUBLIC', 'PRIVATE', 'DIRECT', 'IDEA']).optional(),
    iconUrl: zod_1.z.string().url().optional(),
    maxMembers: zod_1.z.number().int().min(2).max(1000).optional(),
});
const UpdateRoomSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    iconUrl: zod_1.z.string().url().optional(),
    isActive: zod_1.z.boolean().optional(),
    slowModeDelay: zod_1.z.number().int().min(0).max(300).optional(),
});
const SendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(4000),
    replyToId: zod_1.z.string().optional(),
    attachments: zod_1.z.array(zod_1.z.string().url()).max(10).optional(),
    mentions: zod_1.z.array(zod_1.z.string()).max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
const EditMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(4000),
});
const UpdateRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['ADMIN', 'MODERATOR', 'MEMBER']),
});
const requireAuth = (req, res, next) => {
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
router.get('/rooms', (0, express_async_handler_1.default)(async (req, res) => {
    const type = req.query.type;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const cursor = req.query.cursor;
    const result = await chat_service_1.default.listRooms({
        type: type,
        limit,
        cursor,
        activeOnly: true,
    });
    res.json(result);
}));
// GET /api/chat/rooms/my - Get rooms user has joined
router.get('/rooms/my', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    const rooms = await chat_service_1.default.getUserRooms(req.userId);
    res.json({ rooms });
}));
// POST /api/chat/rooms - Create a new room
router.post('/rooms', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    const input = CreateRoomSchema.parse(req.body);
    const room = await chat_service_1.default.createRoom({
        ...input,
        createdById: req.userId,
    });
    res.status(201).json(room);
}));
// GET /api/chat/rooms/:slug - Get room by slug
router.get('/rooms/:slug', (0, express_async_handler_1.default)(async (req, res) => {
    const room = await chat_service_1.default.getRoomBySlug(req.params.slug);
    if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
    }
    res.json(room);
}));
// PATCH /api/chat/rooms/:roomId - Update room settings
router.patch('/rooms/:roomId', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    const updates = UpdateRoomSchema.parse(req.body);
    try {
        const room = await chat_service_1.default.updateRoom(req.params.roomId, req.userId, updates);
        res.json(room);
    }
    catch (error) {
        if (error.message === 'Permission denied') {
            res.status(403).json({ error: error.message });
            return;
        }
        throw error;
    }
}));
// DELETE /api/chat/rooms/:roomId - Delete room
router.delete('/rooms/:roomId', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    try {
        await chat_service_1.default.deleteRoom(req.params.roomId, req.userId);
        res.json({ success: true });
    }
    catch (error) {
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
router.post('/rooms/:roomId/join', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    const result = await chat_service_1.default.joinRoom(req.params.roomId, req.userId);
    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }
    res.json({ success: true, participant: result.participant });
}));
// POST /api/chat/rooms/:roomId/leave - Leave a room
router.post('/rooms/:roomId/leave', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    try {
        await chat_service_1.default.leaveRoom(req.params.roomId, req.userId);
        res.json({ success: true });
    }
    catch (error) {
        if (error.message.includes('Owner')) {
            res.status(400).json({ error: error.message });
            return;
        }
        throw error;
    }
}));
// GET /api/chat/rooms/:roomId/participants - Get room participants
router.get('/rooms/:roomId/participants', (0, express_async_handler_1.default)(async (req, res) => {
    const participants = await chat_service_1.default.getRoomParticipants(req.params.roomId);
    res.json({ participants });
}));
// PATCH /api/chat/rooms/:roomId/participants/:userId/role - Update user role
router.patch('/rooms/:roomId/participants/:targetUserId/role', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    const { role } = UpdateRoleSchema.parse(req.body);
    try {
        await chat_service_1.default.updateParticipantRole(req.params.roomId, req.params.targetUserId, role, req.userId);
        res.json({ success: true });
    }
    catch (error) {
        if (error.message.includes('Permission') || error.message.includes('owner')) {
            res.status(403).json({ error: error.message });
            return;
        }
        throw error;
    }
}));
// POST /api/chat/rooms/:roomId/participants/:userId/ban - Ban user
router.post('/rooms/:roomId/participants/:targetUserId/ban', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    try {
        await chat_service_1.default.banUser(req.params.roomId, req.params.targetUserId, req.userId);
        res.json({ success: true });
    }
    catch (error) {
        if (error.message.includes('Permission') || error.message.includes('Cannot ban')) {
            res.status(403).json({ error: error.message });
            return;
        }
        throw error;
    }
}));
// ============================================
// MESSAGE ENDPOINTS
// ============================================
// GET /api/chat/rooms/:roomId/messages - Get messages with pagination
router.get('/rooms/:roomId/messages', (0, express_async_handler_1.default)(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const cursor = req.query.cursor;
    const result = await chat_service_1.default.getMessages(req.params.roomId, { limit, cursor });
    res.json(result);
}));
// POST /api/chat/rooms/:roomId/messages - Send a message
router.post('/rooms/:roomId/messages', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    const input = SendMessageSchema.parse(req.body);
    try {
        const message = await chat_service_1.default.sendMessage({
            ...input,
            roomId: req.params.roomId,
            authorId: req.userId,
        });
        res.status(201).json(message);
    }
    catch (error) {
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
router.get('/rooms/:roomId/messages/pinned', (0, express_async_handler_1.default)(async (req, res) => {
    const messages = await chat_service_1.default.getPinnedMessages(req.params.roomId);
    res.json({ messages });
}));
// PATCH /api/chat/messages/:messageId - Edit a message
router.patch('/messages/:messageId', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    const { content } = EditMessageSchema.parse(req.body);
    try {
        const message = await chat_service_1.default.editMessage({
            messageId: req.params.messageId,
            userId: req.userId,
            content,
        });
        res.json(message);
    }
    catch (error) {
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
router.delete('/messages/:messageId', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    try {
        await chat_service_1.default.deleteMessage(req.params.messageId, req.userId);
        res.json({ success: true });
    }
    catch (error) {
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
router.post('/messages/:messageId/pin', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    const pin = req.body.pin !== false; // Default to true
    try {
        await chat_service_1.default.pinMessage(req.params.messageId, req.userId, pin);
        res.json({ success: true, isPinned: pin });
    }
    catch (error) {
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
router.post('/rooms/:roomId/read', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    await chat_service_1.default.markAsRead(req.params.roomId, req.userId);
    res.json({ success: true });
}));
// GET /api/chat/unread - Get unread counts for all rooms
router.get('/unread', requireAuth, (0, express_async_handler_1.default)(async (req, res) => {
    const unread = await chat_service_1.default.getUnreadCounts(req.userId);
    res.json({ unread });
}));
exports.default = router;
//# sourceMappingURL=chat.routes.js.map