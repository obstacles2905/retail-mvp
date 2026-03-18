-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_skuId_fkey";

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "buyerId" TEXT,
ADD COLUMN     "productName" TEXT,
ALTER COLUMN "skuId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
