-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "selfDescription" TEXT;
ALTER TABLE "Profile" ADD COLUMN "flatDescription" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "agreedPricePerDayCredits" INTEGER;
ALTER TABLE "Match" ADD COLUMN "lastReadAtUserA" DATETIME;
ALTER TABLE "Match" ADD COLUMN "lastReadAtUserB" DATETIME;
