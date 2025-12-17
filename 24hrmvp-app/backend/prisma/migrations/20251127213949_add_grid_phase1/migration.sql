-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FARCASTER', 'TWITTER', 'INSTAGRAM', 'TIKTOK');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('DISCUSSION', 'QUESTION', 'ANNOUNCEMENT', 'SHOWCASE', 'FEEDBACK');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ModerationEntityType" AS ENUM ('SOCIAL_POST', 'FORUM_POST', 'COMMENT', 'USER');

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "authorFid" INTEGER,
    "authorUsername" TEXT NOT NULL,
    "authorDisplayName" TEXT,
    "authorAvatar" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "hashtags" TEXT[],
    "mentions" TEXT[],
    "channelId" TEXT,
    "castHash" TEXT,
    "parentHash" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "externalUrl" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "moderationFlag" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT,
    "type" "PostType" NOT NULL DEFAULT 'DISCUSSION',
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "ideaId" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "wilsonScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hotScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastReplyAt" TIMESTAMP(3),

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPostVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPostVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationQueue" (
    "id" TEXT NOT NULL,
    "entityType" "ModerationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "aiScore" DOUBLE PRECISION,
    "aiCategories" JSONB,
    "aiReason" TEXT,
    "action" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reportedBy" TEXT,
    "reportReason" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialPost_platform_publishedAt_idx" ON "SocialPost"("platform", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "SocialPost_authorFid_idx" ON "SocialPost"("authorFid");

-- CreateIndex
CREATE INDEX "SocialPost_channelId_publishedAt_idx" ON "SocialPost"("channelId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "SocialPost_isFeatured_publishedAt_idx" ON "SocialPost"("isFeatured", "publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SocialPost_platform_externalId_key" ON "SocialPost"("platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumPost_slug_key" ON "ForumPost"("slug");

-- CreateIndex
CREATE INDEX "ForumPost_type_hotScore_idx" ON "ForumPost"("type", "hotScore" DESC);

-- CreateIndex
CREATE INDEX "ForumPost_type_wilsonScore_idx" ON "ForumPost"("type", "wilsonScore" DESC);

-- CreateIndex
CREATE INDEX "ForumPost_type_createdAt_idx" ON "ForumPost"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ForumPost_isPinned_hotScore_idx" ON "ForumPost"("isPinned", "hotScore" DESC);

-- CreateIndex
CREATE INDEX "ForumPost_parentId_idx" ON "ForumPost"("parentId");

-- CreateIndex
CREATE INDEX "ForumPost_authorId_idx" ON "ForumPost"("authorId");

-- CreateIndex
CREATE INDEX "ForumPost_ideaId_idx" ON "ForumPost"("ideaId");

-- CreateIndex
CREATE INDEX "ForumPost_moderationStatus_idx" ON "ForumPost"("moderationStatus");

-- CreateIndex
CREATE INDEX "ForumPostVote_postId_idx" ON "ForumPostVote"("postId");

-- CreateIndex
CREATE INDEX "ForumPostVote_userId_idx" ON "ForumPostVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumPostVote_userId_postId_key" ON "ForumPostVote"("userId", "postId");

-- CreateIndex
CREATE INDEX "ForumBookmark_userId_createdAt_idx" ON "ForumBookmark"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ForumBookmark_userId_postId_key" ON "ForumBookmark"("userId", "postId");

-- CreateIndex
CREATE INDEX "ModerationQueue_action_createdAt_idx" ON "ModerationQueue"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ModerationQueue_entityType_action_idx" ON "ModerationQueue"("entityType", "action");

-- CreateIndex
CREATE INDEX "ModerationQueue_reviewedById_idx" ON "ModerationQueue"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "ModerationQueue_entityType_entityId_key" ON "ModerationQueue"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "User_reputation_idx" ON "User"("reputation");

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostVote" ADD CONSTRAINT "ForumPostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostVote" ADD CONSTRAINT "ForumPostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumBookmark" ADD CONSTRAINT "ForumBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumBookmark" ADD CONSTRAINT "ForumBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationQueue" ADD CONSTRAINT "ModerationQueue_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
