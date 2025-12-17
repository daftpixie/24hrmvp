// src/types/chat.ts
// Phase 3A: Chat System Type Definitions

import { ChatRoomType, ChatRole, ModerationStatus } from '@prisma/client';

// ============================================
// ROOM TYPES
// ============================================

export interface ChatRoomBasic {
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
}

export interface ChatRoomWithCreator extends ChatRoomBasic {
  createdBy: UserBasic;
}

export interface ChatRoomWithCounts extends ChatRoomWithCreator {
  _count?: {
    participants: number;
    messages: number;
  };
}

export interface CreateRoomInput {
  name: string;
  description?: string;
  type?: ChatRoomType;
  iconUrl?: string;
  maxMembers?: number;
  createdById: string;
}

export interface UpdateRoomInput {
  name?: string;
  description?: string;
  iconUrl?: string;
  isActive?: boolean;
  slowModeDelay?: number;
}

// ============================================
// MESSAGE TYPES
// ============================================

export interface ChatMessageBasic {
  id: string;
  content: string;
  roomId: string;
  authorId: string;
  replyToId: string | null;
  attachments: string[];
  mentions: string[];
  metadata: Record<string, unknown> | null;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  moderationStatus: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
}

export interface ChatMessageWithAuthor extends ChatMessageBasic {
  author: UserBasic;
  replyTo?: {
    id: string;
    content: string;
    author: { username: string };
  } | null;
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

export interface EditMessageInput {
  messageId: string;
  userId: string;
  content: string;
}

// ============================================
// PARTICIPANT TYPES
// ============================================

export interface ChatParticipantBasic {
  id: string;
  roomId: string;
  userId: string;
  role: ChatRole;
  nickname: string | null;
  isMuted: boolean;
  isBanned: boolean;
  lastReadAt: Date;
  unreadCount: number;
  joinedAt: Date;
}

export interface ChatParticipantWithUser extends ChatParticipantBasic {
  user: UserBasic;
}

export interface UserBasic {
  id: string;
  username: string;
  displayName: string | null;
  pfpUrl: string | null;
}

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

export interface ChatMessageEvent {
  type: 'chat:message';
  data: ChatMessageWithAuthor;
}

export interface ChatMessageEditedEvent {
  type: 'chat:messageEdited';
  data: ChatMessageWithAuthor;
}

export interface ChatMessageDeletedEvent {
  type: 'chat:messageDeleted';
  data: {
    messageId: string;
    roomId: string;
  };
}

export interface ChatMessagePinnedEvent {
  type: 'chat:messagePinned';
  data: {
    messageId: string;
    roomId: string;
    isPinned: boolean;
  };
}

export interface ChatUserJoinedEvent {
  type: 'chat:userJoined';
  data: {
    roomId: string;
    user: UserBasic;
  };
}

export interface ChatUserLeftEvent {
  type: 'chat:userLeft';
  data: {
    roomId: string;
    userId: string;
  };
}

export interface ChatUserBannedEvent {
  type: 'chat:userBanned';
  data: {
    roomId: string;
    userId: string;
  };
}

export interface ChatRoomDeletedEvent {
  type: 'chat:roomDeleted';
  data: {
    roomId: string;
  };
}

export interface ChatTypingEvent {
  type: 'chat:typing';
  data: {
    roomId: string;
    userId: string;
    username: string;
    isTyping: boolean;
  };
}

export type ChatEvent =
  | ChatMessageEvent
  | ChatMessageEditedEvent
  | ChatMessageDeletedEvent
  | ChatMessagePinnedEvent
  | ChatUserJoinedEvent
  | ChatUserLeftEvent
  | ChatUserBannedEvent
  | ChatRoomDeletedEvent
  | ChatTypingEvent;

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface RoomListResponse {
  rooms: ChatRoomWithCounts[];
  nextCursor: string | null;
}

export interface MessageListResponse {
  messages: ChatMessageWithAuthor[];
  nextCursor: string | null;
}

export interface ParticipantListResponse {
  participants: ChatParticipantWithUser[];
}

export interface UnreadCountResponse {
  unread: Array<{
    roomId: string;
    unreadCount: number;
  }>;
}

export interface JoinRoomResponse {
  success: boolean;
  participant?: ChatParticipantBasic;
  error?: string;
}

export interface SuccessResponse {
  success: boolean;
}

export interface ErrorResponse {
  error: string;
}
