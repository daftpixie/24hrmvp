// src/services/chat.service.ts
// Phase 3A: Chat System Service
// Provides room management, messaging, and participant tracking

import { PrismaClient, ChatRoomType, ChatRole, ModerationStatus, Prisma } from '@prisma/client';
import { getIO } from './websocket';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface CreateRoomInput {
  name: string;
  description?: string;
  type?: ChatRoomType;
  iconUrl?: string;
  maxMembers?: number;
  createdById: string;
}

export interface SendMessageInput {
  roomId: string;
  authorId: string;
  content: string;
  replyToId?: string;
  attachments?: string[];
  mentions?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMessageInput {
  messageId: string;
  userId: string;
  content: string;
}

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

export interface RoomWithDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  type: ChatRoomType;
  memberCount: number;
  messageCount: number;
  lastMessageAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  _count?: {
    participants: number;
    messages: number;
  };
}

export interface MessageWithAuthor {
  id: string;
  content: string;
  roomId: string;
  authorId: string;
  replyToId: string | null;
  attachments: string[];
  mentions: string[];
  metadata: Prisma.JsonValue;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    author: {
      username: string;
    };
  } | null;
}

// ============================================
// SLUG GENERATION
// ============================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (await prisma.chatRoom.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// ============================================
// ROOM MANAGEMENT
// ============================================

export async function createRoom(input: CreateRoomInput): Promise<RoomWithDetails> {
  const slug = await ensureUniqueSlug(generateSlug(input.name));
  
  const room = await prisma.$transaction(async (tx) => {
    // Create the room
    const newRoom = await tx.chatRoom.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        iconUrl: input.iconUrl,
        type: input.type || 'PUBLIC',
        maxMembers: input.maxMembers || 100,
        createdById: input.createdById,
        memberCount: 1, // Creator is first member
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            pfpUrl: true,
          },
        },
      },
    });
    
    // Add creator as OWNER participant
    await tx.chatParticipant.create({
      data: {
        roomId: newRoom.id,
        userId: input.createdById,
        role: 'OWNER',
      },
    });
    
    return newRoom;
  });
  
  return room;
}

export async function getRoomBySlug(slug: string): Promise<RoomWithDetails | null> {
  return prisma.chatRoom.findUnique({
    where: { slug },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          displayName: true,
          pfpUrl: true,
        },
      },
      _count: {
        select: {
          participants: true,
          messages: true,
        },
      },
    },
  });
}

export async function getRoomById(id: string): Promise<RoomWithDetails | null> {
  return prisma.chatRoom.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          displayName: true,
          pfpUrl: true,
        },
      },
      _count: {
        select: {
          participants: true,
          messages: true,
        },
      },
    },
  });
}

export async function listRooms(options: {
  type?: ChatRoomType;
  activeOnly?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<{ rooms: RoomWithDetails[]; nextCursor: string | null }> {
  const limit = options.limit || 20;
  
  const where: Prisma.ChatRoomWhereInput = {};
  if (options.type) where.type = options.type;
  if (options.activeOnly !== false) where.isActive = true;
  
  const rooms = await prisma.chatRoom.findMany({
    where,
    take: limit + 1,
    ...(options.cursor && {
      skip: 1,
      cursor: { id: options.cursor },
    }),
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          displayName: true,
          pfpUrl: true,
        },
      },
      _count: {
        select: {
          participants: true,
          messages: true,
        },
      },
    },
  });
  
  const hasMore = rooms.length > limit;
  const results = hasMore ? rooms.slice(0, -1) : rooms;
  
  return {
    rooms: results,
    nextCursor: hasMore ? results[results.length - 1].id : null,
  };
}

export async function getUserRooms(userId: string): Promise<RoomWithDetails[]> {
  const participations = await prisma.chatParticipant.findMany({
    where: {
      userId,
      isBanned: false,
    },
    include: {
      room: {
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
              pfpUrl: true,
            },
          },
          _count: {
            select: {
              participants: true,
              messages: true,
            },
          },
        },
      },
    },
    orderBy: {
      room: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    },
  });
  
  return participations.map(p => p.room);
}

export async function updateRoom(
  roomId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    iconUrl?: string;
    isActive?: boolean;
    slowModeDelay?: number;
  }
): Promise<RoomWithDetails | null> {
  // Check if user has permission (OWNER or ADMIN)
  const participant = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  
  if (!participant || !['OWNER', 'ADMIN'].includes(participant.role)) {
    throw new Error('Permission denied');
  }
  
  return prisma.chatRoom.update({
    where: { id: roomId },
    data: updates,
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          displayName: true,
          pfpUrl: true,
        },
      },
    },
  });
}

export async function deleteRoom(roomId: string, userId: string): Promise<boolean> {
  // Only OWNER can delete
  const participant = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  
  if (!participant || participant.role !== 'OWNER') {
    throw new Error('Only room owner can delete the room');
  }
  
  await prisma.chatRoom.delete({ where: { id: roomId } });
  
  // Notify all clients in room
  const io = getIO();
  if (io) {
    io.to(`chat:${roomId}`).emit('chat:roomDeleted', { roomId });
  }
  
  return true;
}

// ============================================
// PARTICIPANT MANAGEMENT
// ============================================

export async function joinRoom(
  roomId: string,
  userId: string
): Promise<{ success: boolean; participant?: Prisma.ChatParticipantGetPayload<{}>; error?: string }> {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { _count: { select: { participants: true } } },
  });
  
  if (!room) {
    return { success: false, error: 'Room not found' };
  }
  
  if (!room.isActive) {
    return { success: false, error: 'Room is not active' };
  }
  
  if (room.type === 'PRIVATE') {
    return { success: false, error: 'Cannot join private room without invitation' };
  }
  
  if (room._count.participants >= room.maxMembers) {
    return { success: false, error: 'Room is full' };
  }
  
  // Check if already a participant
  const existing = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  
  if (existing) {
    if (existing.isBanned) {
      return { success: false, error: 'You are banned from this room' };
    }
    return { success: true, participant: existing };
  }
  
  const participant = await prisma.$transaction(async (tx) => {
    const newParticipant = await tx.chatParticipant.create({
      data: {
        roomId,
        userId,
        role: 'MEMBER',
      },
    });
    
    await tx.chatRoom.update({
      where: { id: roomId },
      data: { memberCount: { increment: 1 } },
    });
    
    return newParticipant;
  });
  
  // Broadcast join event
  const io = getIO();
  if (io) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, pfpUrl: true },
    });
    io.to(`chat:${roomId}`).emit('chat:userJoined', { roomId, user });
  }
  
  return { success: true, participant };
}

export async function leaveRoom(roomId: string, userId: string): Promise<boolean> {
  const participant = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  
  if (!participant) {
    return false;
  }
  
  if (participant.role === 'OWNER') {
    throw new Error('Owner cannot leave. Transfer ownership or delete the room.');
  }
  
  await prisma.$transaction(async (tx) => {
    await tx.chatParticipant.delete({
      where: { roomId_userId: { roomId, userId } },
    });
    
    await tx.chatRoom.update({
      where: { id: roomId },
      data: { memberCount: { decrement: 1 } },
    });
  });
  
  // Broadcast leave event
  const io = getIO();
  if (io) {
    io.to(`chat:${roomId}`).emit('chat:userLeft', { roomId, userId });
  }
  
  return true;
}

export async function getRoomParticipants(roomId: string): Promise<{
  id: string;
  role: ChatRole;
  nickname: string | null;
  joinedAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
}[]> {
  const participants = await prisma.chatParticipant.findMany({
    where: { roomId, isBanned: false },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          pfpUrl: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' }, // OWNER first, then ADMIN, etc.
      { joinedAt: 'asc' },
    ],
  });
  
  return participants;
}

export async function updateParticipantRole(
  roomId: string,
  targetUserId: string,
  newRole: ChatRole,
  actorUserId: string
): Promise<boolean> {
  // Get actor's role
  const actor = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: actorUserId } },
  });
  
  if (!actor || !['OWNER', 'ADMIN'].includes(actor.role)) {
    throw new Error('Permission denied');
  }
  
  // Cannot change owner's role
  const target = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: targetUserId } },
  });
  
  if (!target) {
    throw new Error('User is not a participant');
  }
  
  if (target.role === 'OWNER') {
    throw new Error('Cannot change owner role directly');
  }
  
  // Only owner can promote to admin
  if (newRole === 'ADMIN' && actor.role !== 'OWNER') {
    throw new Error('Only owner can promote to admin');
  }
  
  await prisma.chatParticipant.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { role: newRole },
  });
  
  return true;
}

export async function banUser(
  roomId: string,
  targetUserId: string,
  actorUserId: string
): Promise<boolean> {
  const actor = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: actorUserId } },
  });
  
  if (!actor || !['OWNER', 'ADMIN', 'MODERATOR'].includes(actor.role)) {
    throw new Error('Permission denied');
  }
  
  const target = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: targetUserId } },
  });
  
  if (!target) {
    throw new Error('User is not a participant');
  }
  
  // Cannot ban owner or someone with equal/higher role
  const roleHierarchy = { OWNER: 0, ADMIN: 1, MODERATOR: 2, MEMBER: 3 };
  if (roleHierarchy[target.role] <= roleHierarchy[actor.role]) {
    throw new Error('Cannot ban user with equal or higher role');
  }
  
  await prisma.chatParticipant.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { isBanned: true },
  });
  
  // Notify the banned user
  const io = getIO();
  if (io) {
    io.to(`chat:${roomId}`).emit('chat:userBanned', { roomId, userId: targetUserId });
  }
  
  return true;
}

// ============================================
// MESSAGING
// ============================================

export async function sendMessage(input: SendMessageInput): Promise<MessageWithAuthor> {
  // Check if user is a participant and not banned
  const participant = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId: input.roomId, userId: input.authorId } },
  });
  
  if (!participant) {
    throw new Error('You must join the room to send messages');
  }
  
  if (participant.isBanned) {
    throw new Error('You are banned from this room');
  }
  
  // Check room status
  const room = await prisma.chatRoom.findUnique({
    where: { id: input.roomId },
  });
  
  if (!room || !room.isActive) {
    throw new Error('Room is not available');
  }
  
  // Check slow mode (if enabled)
  if (room.slowModeDelay > 0 && participant.role === 'MEMBER') {
    const lastMessage = await prisma.chatMessage.findFirst({
      where: { roomId: input.roomId, authorId: input.authorId },
      orderBy: { createdAt: 'desc' },
    });
    
    if (lastMessage) {
      const elapsed = (Date.now() - lastMessage.createdAt.getTime()) / 1000;
      if (elapsed < room.slowModeDelay) {
        throw new Error(`Slow mode enabled. Please wait ${Math.ceil(room.slowModeDelay - elapsed)} seconds.`);
      }
    }
  }
  
  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.chatMessage.create({
      data: {
        content: input.content,
        roomId: input.roomId,
        authorId: input.authorId,
        replyToId: input.replyToId,
        attachments: input.attachments || [],
        mentions: input.mentions || [],
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            pfpUrl: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: { select: { username: true } },
          },
        },
      },
    });
    
    // Update room stats
    await tx.chatRoom.update({
      where: { id: input.roomId },
      data: {
        messageCount: { increment: 1 },
        lastMessageAt: new Date(),
      },
    });
    
    // Update unread counts for other participants
    await tx.chatParticipant.updateMany({
      where: {
        roomId: input.roomId,
        userId: { not: input.authorId },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });
    
    return newMessage;
  });
  
  // Broadcast to room
  const io = getIO();
  if (io) {
    io.to(`chat:${input.roomId}`).emit('chat:message', message);
  }
  
  return message;
}

export async function getMessages(
  roomId: string,
  options: PaginationOptions = {}
): Promise<{ messages: MessageWithAuthor[]; nextCursor: string | null }> {
  const limit = options.limit || 50;
  
  const messages = await prisma.chatMessage.findMany({
    where: {
      roomId,
      isDeleted: false,
    },
    take: limit + 1,
    ...(options.cursor && {
      skip: 1,
      cursor: { id: options.cursor },
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          pfpUrl: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          author: { select: { username: true } },
        },
      },
    },
  });
  
  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, -1) : messages;
  
  return {
    messages: results,
    nextCursor: hasMore ? results[results.length - 1].id : null,
  };
}

export async function editMessage(input: UpdateMessageInput): Promise<MessageWithAuthor> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: input.messageId },
  });
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  if (message.authorId !== input.userId) {
    throw new Error('You can only edit your own messages');
  }
  
  if (message.isDeleted) {
    throw new Error('Cannot edit deleted message');
  }
  
  const updated = await prisma.chatMessage.update({
    where: { id: input.messageId },
    data: {
      content: input.content,
      isEdited: true,
      editedAt: new Date(),
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          pfpUrl: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          author: { select: { username: true } },
        },
      },
    },
  });
  
  // Broadcast edit
  const io = getIO();
  if (io) {
    io.to(`chat:${message.roomId}`).emit('chat:messageEdited', updated);
  }
  
  return updated;
}

export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<boolean> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  // Check if user is author or has mod permissions
  if (message.authorId !== userId) {
    const participant = await prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId: message.roomId, userId } },
    });
    
    if (!participant || !['OWNER', 'ADMIN', 'MODERATOR'].includes(participant.role)) {
      throw new Error('Permission denied');
    }
  }
  
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      content: '[Message deleted]',
    },
  });
  
  // Broadcast deletion
  const io = getIO();
  if (io) {
    io.to(`chat:${message.roomId}`).emit('chat:messageDeleted', {
      messageId,
      roomId: message.roomId,
    });
  }
  
  return true;
}

export async function pinMessage(
  messageId: string,
  userId: string,
  pin: boolean
): Promise<boolean> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  // Check mod permissions
  const participant = await prisma.chatParticipant.findUnique({
    where: { roomId_userId: { roomId: message.roomId, userId } },
  });
  
  if (!participant || !['OWNER', 'ADMIN', 'MODERATOR'].includes(participant.role)) {
    throw new Error('Permission denied');
  }
  
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { isPinned: pin },
  });
  
  // Broadcast pin status change
  const io = getIO();
  if (io) {
    io.to(`chat:${message.roomId}`).emit('chat:messagePinned', {
      messageId,
      roomId: message.roomId,
      isPinned: pin,
    });
  }
  
  return true;
}

export async function getPinnedMessages(roomId: string): Promise<MessageWithAuthor[]> {
  return prisma.chatMessage.findMany({
    where: {
      roomId,
      isPinned: true,
      isDeleted: false,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          pfpUrl: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          author: { select: { username: true } },
        },
      },
    },
  });
}

// ============================================
// READ TRACKING
// ============================================

export async function markAsRead(roomId: string, userId: string): Promise<void> {
  await prisma.chatParticipant.update({
    where: { roomId_userId: { roomId, userId } },
    data: {
      lastReadAt: new Date(),
      unreadCount: 0,
    },
  });
}

export async function getUnreadCounts(userId: string): Promise<{ roomId: string; unreadCount: number }[]> {
  const participants = await prisma.chatParticipant.findMany({
    where: { userId, unreadCount: { gt: 0 } },
    select: { roomId: true, unreadCount: true },
  });
  
  return participants;
}

// ============================================
// DEFAULT ROOMS SEEDING
// ============================================

export async function seedDefaultRooms(systemUserId: string): Promise<void> {
  const defaultRooms = [
    {
      name: 'General',
      slug: 'general',
      description: 'General discussion for the 24HRMVP community',
      type: 'PUBLIC' as ChatRoomType,
    },
    {
      name: 'Ideas',
      slug: 'ideas',
      description: 'Discuss MVP ideas and brainstorm new concepts',
      type: 'PUBLIC' as ChatRoomType,
    },
    {
      name: 'Builders',
      slug: 'builders',
      description: 'For keyboard warlocks building MVPs',
      type: 'PUBLIC' as ChatRoomType,
    },
    {
      name: 'Announcements',
      slug: 'announcements',
      description: 'Official announcements from the 24HRMVP team',
      type: 'PUBLIC' as ChatRoomType,
    },
  ];
  
  for (const room of defaultRooms) {
    const existing = await prisma.chatRoom.findUnique({ where: { slug: room.slug } });
    if (!existing) {
      await prisma.chatRoom.create({
        data: {
          ...room,
          createdById: systemUserId,
          memberCount: 0,
        },
      });
      console.log(`âœ“ Created default room: ${room.name}`);
    }
  }
}

export default {
  // Rooms
  createRoom,
  getRoomBySlug,
  getRoomById,
  listRooms,
  getUserRooms,
  updateRoom,
  deleteRoom,
  
  // Participants
  joinRoom,
  leaveRoom,
  getRoomParticipants,
  updateParticipantRole,
  banUser,
  
  // Messages
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  pinMessage,
  getPinnedMessages,
  
  // Read tracking
  markAsRead,
  getUnreadCounts,
  
  // Seeding
  seedDefaultRooms,
};


