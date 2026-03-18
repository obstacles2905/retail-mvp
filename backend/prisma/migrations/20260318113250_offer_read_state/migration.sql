-- CreateTable
CREATE TABLE "OfferReadState" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfferReadState_userId_idx" ON "OfferReadState"("userId");

-- CreateIndex
CREATE INDEX "OfferReadState_offerId_idx" ON "OfferReadState"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferReadState_offerId_userId_key" ON "OfferReadState"("offerId", "userId");

-- AddForeignKey
ALTER TABLE "OfferReadState" ADD CONSTRAINT "OfferReadState_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferReadState" ADD CONSTRAINT "OfferReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
