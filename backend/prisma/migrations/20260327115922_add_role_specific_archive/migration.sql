-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "buyerArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vendorArchived" BOOLEAN NOT NULL DEFAULT false;
