/*
  Warnings:

  - You are about to drop the column `category` on the `Sku` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[teamInviteToken]` on the table `Workspace` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OfferItem" ADD COLUMN     "finalPrice" DECIMAL(65,30),
ADD COLUMN     "initialPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "savedAmount" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Sku" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "teamInviteToken" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_workspaceId_normalizedName_key" ON "Category"("workspaceId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_teamInviteToken_key" ON "Workspace"("teamInviteToken");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
