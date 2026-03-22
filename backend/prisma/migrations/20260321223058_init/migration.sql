/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inviteToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "category" TEXT,
ADD COLUMN     "isNovelty" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Sku" ADD COLUMN     "articleCode" TEXT,
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uom" TEXT NOT NULL DEFAULT 'item';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inviteToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");
