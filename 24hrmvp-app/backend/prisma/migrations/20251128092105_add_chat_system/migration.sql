-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('PUBLIC', 'PRIVATE', 'DIRECT', 'IDEA');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- AlterEnum
ALTER TYPE "ModerationEntityType" ADD VALUE 'CHAT_MESSAGE';

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "type" "ChatRoomType" NOT NULL DEFAULT 'PUBLIC',
    "createdById" TEXT NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowReplies" BOOLEAN NOT NULL DEFAULT true,
    "slowModeDelay" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "replyToId" TEXT,
    "attachments" TEXT[],
    "mentions" TEXT[],
    "metadata" JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL DEFAULT 'MEMBER',
    "nickname" TEXT,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_slug_key" ON "ChatRoom"("slug");

-- CreateIndex
CREATE INDEX "ChatRoom_slug_idx" ON "ChatRoom"("slug");

-- CreateIndex
CREATE INDEX "ChatRoom_type_isActive_idx" ON "ChatRoom"("type", "isActive");

-- CreateIndex
CREATE INDEX "ChatRoom_createdById_idx" ON "ChatRoom"("createdById");

-- CreateIndex
CREATE INDEX "ChatRoom_lastMessageAt_idx" ON "ChatRoom"("lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "ChatMessage_roomId_createdAt_idx" ON "ChatMessage"("roomId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ChatMessage_authorId_idx" ON "ChatMessage"("authorId");

-- CreateIndex
CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

-- CreateIndex
CREATE INDEX "ChatMessage_roomId_isPinned_idx" ON "ChatMessage"("roomId", "isPinned");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_idx" ON "ChatParticipant"("userId");

-- CreateIndex
CREATE INDEX "ChatParticipant_roomId_role_idx" ON "ChatParticipant"("roomId", "role");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_lastReadAt_idx" ON "ChatParticipant"("userId", "lastReadAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_roomId_userId_key" ON "ChatParticipant"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
