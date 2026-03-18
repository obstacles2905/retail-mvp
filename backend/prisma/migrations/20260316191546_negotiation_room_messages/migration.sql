-- CreateEnum
CREATE TYPE "SystemEventType" AS ENUM ('PRICE_CHANGED', 'DEAL_ACCEPTED', 'TERMS_UPDATED');

-- CreateTable
CREATE TABLE "OfferMessage" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT,
    "isSystemEvent" BOOLEAN NOT NULL DEFAULT false,
    "eventType" "SystemEventType",
    "metaData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OfferMessage" ADD CONSTRAINT "OfferMessage_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferMessage" ADD CONSTRAINT "OfferMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
