/*
  Warnings:

  - The values [IDEA] on the enum `ModerationEntityType` will be removed. If these variants are still used in the database, this will fail.
  - The values [REMOVED] on the enum `ModerationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `attachments` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `commentCount` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `impactScore` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `isFeatured` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeenAt` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `path` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `publicBenefitCategory` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `sdgTargets` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `voteCount` on the `ForumPost` table. All the data in the column will be lost.
  - The `type` column on the `ForumPost` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdAt` on the `LeaderboardEntry` table. All the data in the column will be lost.
  - You are about to drop the column `metric` on the `LeaderboardEntry` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `LeaderboardEntry` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `LeaderboardEntry` table. All the data in the column will be lost.
  - You are about to drop the column `engagementScore` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `metrics` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `postId` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `earnedAt` on the `UserAchievement` table. All the data in the column will be lost.
  - You are about to drop the column `streakType` on the `UserStreak` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `ForumPost` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,period,category]` on the table `LeaderboardEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[platform,externalId]` on the table `SocialPost` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,type]` on the table `UserStreak` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `ForumPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `LeaderboardEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `score` to the `LeaderboardEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorUsername` to the `SocialPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `externalId` to the `SocialPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publishedAt` to the `SocialPost` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `platform` on the `SocialPost` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `targetValue` to the `UserAchievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `UserStreak` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FARCASTER', 'TWITTER', 'INSTAGRAM', 'TIKTOK');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('DISCUSSION', 'QUESTION', 'ANNOUNCEMENT', 'SHOWCASE', 'FEEDBACK');

-- AlterEnum
BEGIN;
CREATE TYPE "ModerationEntityType_new" AS ENUM ('SOCIAL_POST', 'FORUM_POST', 'COMMENT', 'USER', 'CHAT_MESSAGE');
ALTER TABLE "ModerationQueue" ALTER COLUMN "entityType" TYPE "ModerationEntityType_new" USING ("entityType"::text::"ModerationEntityType_new");
ALTER TYPE "ModerationEntityType" RENAME TO "ModerationEntityType_old";
ALTER TYPE "ModerationEntityType_new" RENAME TO "ModerationEntityType";
DROP TYPE "ModerationEntityType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ModerationStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'ESCALATED');
ALTER TABLE "ChatMessage" ALTER COLUMN "moderationStatus" DROP DEFAULT;
ALTER TABLE "ForumPost" ALTER COLUMN "moderationStatus" DROP DEFAULT;
ALTER TABLE "ModerationQueue" ALTER COLUMN "action" DROP DEFAULT;
ALTER TABLE "ForumPost" ALTER COLUMN "moderationStatus" TYPE "ModerationStatus_new" USING ("moderationStatus"::text::"ModerationStatus_new");
ALTER TABLE "ModerationQueue" ALTER COLUMN "action" TYPE "ModerationStatus_new" USING ("action"::text::"ModerationStatus_new");
ALTER TABLE "ChatMessage" ALTER COLUMN "moderationStatus" TYPE "ModerationStatus_new" USING ("moderationStatus"::text::"ModerationStatus_new");
ALTER TYPE "ModerationStatus" RENAME TO "ModerationStatus_old";
ALTER TYPE "ModerationStatus_new" RENAME TO "ModerationStatus";
DROP TYPE "ModerationStatus_old";
ALTER TABLE "ChatMessage" ALTER COLUMN "moderationStatus" SET DEFAULT 'APPROVED';
ALTER TABLE "ForumPost" ALTER COLUMN "moderationStatus" SET DEFAULT 'APPROVED';
ALTER TABLE "ModerationQueue" ALTER COLUMN "action" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "ForumPost" DROP CONSTRAINT "ForumPost_parentId_fkey";

-- DropIndex
DROP INDEX "ForumPost_isPinned_isFeatured_idx";

-- DropIndex
DROP INDEX "ForumPost_publicBenefitCategory_idx";

-- DropIndex
DROP INDEX "ForumPost_score_idx";

-- DropIndex
DROP INDEX "LeaderboardEntry_period_metric_rank_idx";

-- DropIndex
DROP INDEX "LeaderboardEntry_userId_period_metric_key";

-- DropIndex
DROP INDEX "SocialPost_engagementScore_idx";

-- DropIndex
DROP INDEX "SocialPost_platform_createdAt_idx";

-- DropIndex
DROP INDEX "SocialPost_postId_key";

-- DropIndex
DROP INDEX "UserStreak_userId_streakType_idx";

-- DropIndex
DROP INDEX "UserStreak_userId_streakType_key";

-- AlterTable
ALTER TABLE "ForumPost" DROP COLUMN "attachments",
DROP COLUMN "commentCount",
DROP COLUMN "impactScore",
DROP COLUMN "isFeatured",
DROP COLUMN "lastSeenAt",
DROP COLUMN "path",
DROP COLUMN "publicBenefitCategory",
DROP COLUMN "sdgTargets",
DROP COLUMN "voteCount",
ADD COLUMN     "contentHtml" TEXT,
ADD COLUMN     "downvotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hotScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lastReplyAt" TIMESTAMP(3),
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "replyCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "upvotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wilsonScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "title" DROP NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "PostType" NOT NULL DEFAULT 'DISCUSSION';

-- AlterTable
ALTER TABLE "LeaderboardEntry" DROP COLUMN "createdAt",
DROP COLUMN "metric",
DROP COLUMN "updatedAt",
DROP COLUMN "value",
ADD COLUMN     "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "score" DECIMAL(12,2) NOT NULL;

-- AlterTable
ALTER TABLE "SocialPost" DROP COLUMN "engagementScore",
DROP COLUMN "metrics",
DROP COLUMN "postId",
ADD COLUMN     "authorAvatar" TEXT,
ADD COLUMN     "authorDisplayName" TEXT,
ADD COLUMN     "authorFid" INTEGER,
ADD COLUMN     "authorUsername" TEXT NOT NULL,
ADD COLUMN     "castHash" TEXT,
ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "impressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "likes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mentions" TEXT[],
ADD COLUMN     "moderationFlag" TEXT,
ADD COLUMN     "parentHash" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "replies" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reposts" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "platform",
ADD COLUMN     "platform" "SocialPlatform" NOT NULL;

-- AlterTable
ALTER TABLE "UserAchievement" DROP COLUMN "earnedAt",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "targetValue" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "UserStreak" DROP COLUMN "streakType",
ADD COLUMN     "nextDeadline" TIMESTAMP(3),
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "lastActivityAt" DROP NOT NULL,
ALTER COLUMN "lastActivityAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VoteCredit" ALTER COLUMN "consumed" SET DEFAULT 0;

-- DropEnum
DROP TYPE "ForumPostType";

-- DropEnum
DROP TYPE "PublicBenefitCategory";

-- CreateTable
CREATE TABLE "NotificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "notificationUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationToken_token_key" ON "NotificationToken"("token");

-- CreateIndex
CREATE INDEX "NotificationToken_userId_idx" ON "NotificationToken"("userId");

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
CREATE INDEX "LeaderboardEntry_period_category_score_idx" ON "LeaderboardEntry"("period", "category", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_userId_period_category_key" ON "LeaderboardEntry"("userId", "period", "category");

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
CREATE UNIQUE INDEX "UserStreak_userId_type_key" ON "UserStreak"("userId", "type");

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
