-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('FARCASTER', 'SIWE', 'SIWS');

-- CreateEnum
CREATE TYPE "ChainType" AS ENUM ('EVM', 'SOLANA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "primaryAuthProvider" "AuthProvider" NOT NULL DEFAULT 'FARCASTER',
ADD COLUMN     "primaryWalletAddress" TEXT,
ALTER COLUMN "fid" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "fid" INTEGER,
    "walletAddress" TEXT,
    "chainId" INTEGER,
    "chainType" "ChainType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainType" "ChainType" NOT NULL,
    "chainId" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthNonce" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "sessionId" TEXT,
    "chainType" "ChainType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_walletAddress_idx" ON "Account"("walletAddress");

-- CreateIndex
CREATE INDEX "Account_fid_idx" ON "Account"("fid");

-- CreateIndex
CREATE INDEX "Account_provider_idx" ON "Account"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoWallet_address_key" ON "CryptoWallet"("address");

-- CreateIndex
CREATE INDEX "CryptoWallet_userId_idx" ON "CryptoWallet"("userId");

-- CreateIndex
CREATE INDEX "CryptoWallet_chainType_idx" ON "CryptoWallet"("chainType");

-- CreateIndex
CREATE INDEX "CryptoWallet_isPrimary_idx" ON "CryptoWallet"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "AuthNonce_nonce_key" ON "AuthNonce"("nonce");

-- CreateIndex
CREATE INDEX "AuthNonce_nonce_idx" ON "AuthNonce"("nonce");

-- CreateIndex
CREATE INDEX "AuthNonce_expiresAt_idx" ON "AuthNonce"("expiresAt");

-- CreateIndex
CREATE INDEX "User_primaryWalletAddress_idx" ON "User"("primaryWalletAddress");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoWallet" ADD CONSTRAINT "CryptoWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
