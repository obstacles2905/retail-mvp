/*
  Warnings:

  - Added the required column `initiatorRole` to the `Offer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "initiatorRole" "UserRole" NOT NULL DEFAULT 'VENDOR';

-- Backfill (для существующих строк)
UPDATE "Offer" SET "initiatorRole" = 'VENDOR' WHERE "initiatorRole" IS NULL;

-- Remove default after backfill (не хотим полагаться на дефолт в приложении)
ALTER TABLE "Offer" ALTER COLUMN "initiatorRole" DROP DEFAULT;
