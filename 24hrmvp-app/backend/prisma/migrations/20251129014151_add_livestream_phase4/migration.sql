-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'STARTING', 'LIVE', 'ENDING', 'ENDED', 'CANCELLED', 'ERROR');

-- CreateTable
CREATE TABLE "Livestream" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "StreamStatus" NOT NULL DEFAULT 'DRAFT',
    "castrStreamId" TEXT,
    "castrIngestUrl" TEXT,
    "castrStreamKey" TEXT,
    "playbackUrl" TEXT,
    "destinations" JSONB DEFAULT '[]',
    "thumbnailUrl" TEXT,
    "placeholderUrl" TEXT,
    "hostId" TEXT NOT NULL,
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "chatRoomId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "allowChat" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Livestream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivestreamViewer" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "chatMessages" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LivestreamViewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamDestination" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rtmpUrl" TEXT,
    "streamKey" TEXT,
    "metadata" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Livestream_castrStreamId_key" ON "Livestream"("castrStreamId");

-- CreateIndex
CREATE UNIQUE INDEX "Livestream_chatRoomId_key" ON "Livestream"("chatRoomId");

-- CreateIndex
CREATE INDEX "Livestream_hostId_idx" ON "Livestream"("hostId");

-- CreateIndex
CREATE INDEX "Livestream_status_idx" ON "Livestream"("status");

-- CreateIndex
CREATE INDEX "Livestream_scheduledAt_idx" ON "Livestream"("scheduledAt");

-- CreateIndex
CREATE INDEX "Livestream_createdAt_idx" ON "Livestream"("createdAt");

-- CreateIndex
CREATE INDEX "LivestreamViewer_streamId_idx" ON "LivestreamViewer"("streamId");

-- CreateIndex
CREATE INDEX "LivestreamViewer_userId_idx" ON "LivestreamViewer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LivestreamViewer_streamId_sessionId_key" ON "LivestreamViewer"("streamId", "sessionId");

-- CreateIndex
CREATE INDEX "StreamDestination_userId_idx" ON "StreamDestination"("userId");

-- CreateIndex
CREATE INDEX "StreamDestination_platform_idx" ON "StreamDestination"("platform");

-- AddForeignKey
ALTER TABLE "Livestream" ADD CONSTRAINT "Livestream_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Livestream" ADD CONSTRAINT "Livestream_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivestreamViewer" ADD CONSTRAINT "LivestreamViewer_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Livestream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivestreamViewer" ADD CONSTRAINT "LivestreamViewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamDestination" ADD CONSTRAINT "StreamDestination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
