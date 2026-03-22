/*
  Warnings:

  - You are about to drop the column `category` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `currentPrice` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `isNovelty` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `skuId` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `volume` on the `Offer` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_skuId_fkey";

-- AlterTable
ALTER TABLE "Offer" DROP COLUMN "category",
DROP COLUMN "currentPrice",
DROP COLUMN "isNovelty",
DROP COLUMN "productName",
DROP COLUMN "skuId",
DROP COLUMN "unit",
DROP COLUMN "volume";

-- CreateTable
CREATE TABLE "OfferItem" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "skuId" TEXT,
    "productName" TEXT,
    "category" TEXT,
    "isNovelty" BOOLEAN NOT NULL DEFAULT false,
    "currentPrice" DECIMAL(65,30) NOT NULL,
    "volume" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'item',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;
