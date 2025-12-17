/*
  Warnings:

  - The values [SOCIAL_POST,USER] on the enum `ModerationEntityType` will be removed. If these variants are still used in the database, this will fail.
  - The values [ESCALATED] on the enum `ModerationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `contentHtml` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `downvotes` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `hotScore` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `lastReplyAt` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `moderatedAt` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `replyCount` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `upvotes` on the `ForumPost` table. All the data in the column will be lost.
  - You are about to drop the column `wilsonScore` on the `ForumPost` table. All the data in the column will be lost.
  - The `type` column on the `ForumPost` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `calculatedAt` on the `LeaderboardEntry` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `LeaderboardEntry` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `LeaderboardEntry` table. All the data in the column will be lost.
  - You are about to drop the column `authorAvatar` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `authorDisplayName` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `authorFid` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `authorUsername` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `castHash` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `channelId` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `externalUrl` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `fetchedAt` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `impressions` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `isFeatured` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `isHidden` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `likes` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `mentions` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `moderationFlag` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `parentHash` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `replies` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `reposts` on the `SocialPost` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `UserAchievement` table. All the data in the column will be lost.
  - You are about to drop the column `targetValue` on the `UserAchievement` table. All the data in the column will be lost.
  - You are about to drop the column `nextDeadline` on the `UserStreak` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `UserStreak` table. All the data in the column will be lost.
  - You are about to drop the `NotificationToken` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,period,metric]` on the table `LeaderboardEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[votePurchaseId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[postId]` on the table `SocialPost` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,streakType]` on the table `UserStreak` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `path` to the `ForumPost` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `ForumPost` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `metric` to the `LeaderboardEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LeaderboardEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `LeaderboardEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postId` to the `SocialPost` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `platform` on the `SocialPost` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `streakType` to the `UserStreak` table without a default value. This is not possible if the table is not empty.
  - Made the column `lastActivityAt` on table `UserStreak` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PublicBenefitCategory" AS ENUM ('HEALTHCARE_ACCESS', 'EDUCATION_ACCESS', 'CIVIC_PARTICIPATION', 'CLIMATE_ACTION', 'DISABILITY_ACCESS', 'FINANCIAL_INCLUSION', 'OPEN_SOURCE', 'COMMUNITY_BUILDING');

-- CreateEnum
CREATE TYPE "ForumPostType" AS ENUM ('DISCUSSION', 'QUESTION', 'SHOWCASE', 'ANNOUNCEMENT', 'POLL');

-- CreateEnum
CREATE TYPE "VoteCreditSource" AS ENUM ('FREE_DAILY', 'PURCHASED_STRIPE', 'PURCHASED_CRYPTO', 'PURCHASED_POINTS', 'EARNED_REWARD', 'ADMIN_GRANT');

-- CreateEnum
CREATE TYPE "VotePurchaseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- AlterEnum
BEGIN;
CREATE TYPE "ModerationEntityType_new" AS ENUM ('FORUM_POST', 'CHAT_MESSAGE', 'COMMENT', 'IDEA');
ALTER TABLE "ModerationQueue" ALTER COLUMN "entityType" TYPE "ModerationEntityType_new" USING ("entityType"::text::"ModerationEntityType_new");
ALTER TYPE "ModerationEntityType" RENAME TO "ModerationEntityType_old";
ALTER TYPE "ModerationEntityType_new" RENAME TO "ModerationEntityType";
DROP TYPE "ModerationEntityType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ModerationStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'REMOVED');
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
DROP INDEX "ForumPost_isPinned_hotScore_idx";

-- DropIndex
DROP INDEX "ForumPost_slug_key";

-- DropIndex
DROP INDEX "ForumPost_type_hotScore_idx";

-- DropIndex
DROP INDEX "ForumPost_type_wilsonScore_idx";

-- DropIndex
DROP INDEX "LeaderboardEntry_period_category_score_idx";

-- DropIndex
DROP INDEX "LeaderboardEntry_userId_period_category_key";

-- DropIndex
DROP INDEX "SocialPost_authorFid_idx";

-- DropIndex
DROP INDEX "SocialPost_channelId_publishedAt_idx";

-- DropIndex
DROP INDEX "SocialPost_isFeatured_publishedAt_idx";

-- DropIndex
DROP INDEX "SocialPost_platform_externalId_key";

-- DropIndex
DROP INDEX "SocialPost_platform_publishedAt_idx";

-- DropIndex
DROP INDEX "UserStreak_userId_type_key";

-- AlterTable
ALTER TABLE "ForumPost" DROP COLUMN "contentHtml",
DROP COLUMN "downvotes",
DROP COLUMN "hotScore",
DROP COLUMN "lastReplyAt",
DROP COLUMN "moderatedAt",
DROP COLUMN "replyCount",
DROP COLUMN "slug",
DROP COLUMN "upvotes",
DROP COLUMN "wilsonScore",
ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "commentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "impactScore" DECIMAL(5,2),
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "path" VARCHAR(1000) NOT NULL,
ADD COLUMN     "publicBenefitCategory" "PublicBenefitCategory",
ADD COLUMN     "sdgTargets" INTEGER[],
ADD COLUMN     "voteCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "title" SET NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "ForumPostType" NOT NULL DEFAULT 'DISCUSSION';

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "boostExpiresAt" TIMESTAMP(3),
ADD COLUMN     "boostLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "coreFeatures" TEXT[],
ADD COLUMN     "expectedTimeline" TEXT,
ADD COLUMN     "fileAttachments" JSONB,
ADD COLUMN     "fileCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPremiumBoosted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "successMetrics" TEXT,
ADD COLUMN     "targetAudience" TEXT,
ADD COLUMN     "technicalRequirements" TEXT;

-- AlterTable
ALTER TABLE "LeaderboardEntry" DROP COLUMN "calculatedAt",
DROP COLUMN "category",
DROP COLUMN "score",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metric" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "value" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "itemQuantity" INTEGER,
ADD COLUMN     "itemType" TEXT,
ADD COLUMN     "votePurchaseId" TEXT;

-- AlterTable
ALTER TABLE "SocialPost" DROP COLUMN "authorAvatar",
DROP COLUMN "authorDisplayName",
DROP COLUMN "authorFid",
DROP COLUMN "authorUsername",
DROP COLUMN "castHash",
DROP COLUMN "channelId",
DROP COLUMN "externalId",
DROP COLUMN "externalUrl",
DROP COLUMN "fetchedAt",
DROP COLUMN "impressions",
DROP COLUMN "isFeatured",
DROP COLUMN "isHidden",
DROP COLUMN "likes",
DROP COLUMN "mentions",
DROP COLUMN "moderationFlag",
DROP COLUMN "parentHash",
DROP COLUMN "publishedAt",
DROP COLUMN "replies",
DROP COLUMN "reposts",
ADD COLUMN     "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "metrics" JSONB,
ADD COLUMN     "postId" TEXT NOT NULL,
DROP COLUMN "platform",
ADD COLUMN     "platform" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserAchievement" DROP COLUMN "completedAt",
DROP COLUMN "targetValue",
ADD COLUMN     "earnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserStreak" DROP COLUMN "nextDeadline",
DROP COLUMN "type",
ADD COLUMN     "streakType" TEXT NOT NULL,
ALTER COLUMN "lastActivityAt" SET NOT NULL,
ALTER COLUMN "lastActivityAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "NotificationToken";

-- DropEnum
DROP TYPE "PostType";

-- DropEnum
DROP TYPE "SocialPlatform";

-- CreateTable
CREATE TABLE "VoteCredit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "VoteCreditSource" NOT NULL,
    "description" TEXT,
    "purchaseId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "consumed" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoteCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteCredits" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" "VotePurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "metadata" JSONB,
    "purchasedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VotePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteConsumption" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "creditId" TEXT,
    "creditSource" "VoteCreditSource" NOT NULL DEFAULT 'FREE_DAILY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotePricing" (
    "id" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL,
    "priceUsd" DECIMAL(12,2) NOT NULL,
    "priceUsdc" DECIMAL(12,2) NOT NULL,
    "pricePoints" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VotePricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoteCredit_purchaseId_key" ON "VoteCredit"("purchaseId");

-- CreateIndex
CREATE INDEX "VoteCredit_userId_isExpired_idx" ON "VoteCredit"("userId", "isExpired");

-- CreateIndex
CREATE INDEX "VoteCredit_expiresAt_idx" ON "VoteCredit"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VotePurchase_paymentId_key" ON "VotePurchase"("paymentId");

-- CreateIndex
CREATE INDEX "VotePurchase_userId_status_idx" ON "VotePurchase"("userId", "status");

-- CreateIndex
CREATE INDEX "VotePurchase_paymentId_idx" ON "VotePurchase"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "VoteConsumption_voteId_key" ON "VoteConsumption"("voteId");

-- CreateIndex
CREATE INDEX "VoteConsumption_creditId_idx" ON "VoteConsumption"("creditId");

-- CreateIndex
CREATE UNIQUE INDEX "VotePricing_packageName_key" ON "VotePricing"("packageName");

-- CreateIndex
CREATE INDEX "VotePricing_isActive_sortOrder_idx" ON "VotePricing"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ForumPost_type_createdAt_idx" ON "ForumPost"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ForumPost_score_idx" ON "ForumPost"("score" DESC);

-- CreateIndex
CREATE INDEX "ForumPost_isPinned_isFeatured_idx" ON "ForumPost"("isPinned", "isFeatured");

-- CreateIndex
CREATE INDEX "ForumPost_publicBenefitCategory_idx" ON "ForumPost"("publicBenefitCategory");

-- CreateIndex
CREATE INDEX "Idea_isPremiumBoosted_idx" ON "Idea"("isPremiumBoosted");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_period_metric_rank_idx" ON "LeaderboardEntry"("period", "metric", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_userId_period_metric_key" ON "LeaderboardEntry"("userId", "period", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_votePurchaseId_key" ON "Payment"("votePurchaseId");

-- CreateIndex
CREATE INDEX "Payment_itemType_idx" ON "Payment"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPost_postId_key" ON "SocialPost"("postId");

-- CreateIndex
CREATE INDEX "SocialPost_platform_createdAt_idx" ON "SocialPost"("platform", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SocialPost_engagementScore_idx" ON "SocialPost"("engagementScore" DESC);

-- CreateIndex
CREATE INDEX "UserStreak_userId_streakType_idx" ON "UserStreak"("userId", "streakType");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreak_userId_streakType_key" ON "UserStreak"("userId", "streakType");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_votePurchaseId_fkey" FOREIGN KEY ("votePurchaseId") REFERENCES "VotePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ForumPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteCredit" ADD CONSTRAINT "VoteCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteCredit" ADD CONSTRAINT "VoteCredit_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "VotePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotePurchase" ADD CONSTRAINT "VotePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteConsumption" ADD CONSTRAINT "VoteConsumption_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
