-- Tiered cancellation policy: confirmation-fee escrow + cancellation record on Match.
ALTER TABLE "Match" ADD COLUMN "confirmationFeeUserA" INTEGER;
ALTER TABLE "Match" ADD COLUMN "confirmationFeeUserB" INTEGER;
ALTER TABLE "Match" ADD COLUMN "feesHeld" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Match" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "Match" ADD COLUMN "cancelledByUserId" TEXT;

-- Lazy "swap completed" reconciliation (see swapLifecycle.ts).
ALTER TABLE "Match" ADD COLUMN "completedProcessedAt" DATETIME;
ALTER TABLE "Match" ADD COLUMN "ratingWindowClosesAt" DATETIME;

-- Denormalized rating aggregate on Profile, so the swipe candidate batch
-- fetch stays a single flat query with no per-candidate join.
ALTER TABLE "Profile" ADD COLUMN "completedSwapCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Profile" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Profile" ADD COLUMN "ratingOverallAvg" REAL;
ALTER TABLE "Profile" ADD COLUMN "ratingCommunicationAvg" REAL;
ALTER TABLE "Profile" ADD COLUMN "ratingFlatMatchedPct" REAL;
ALTER TABLE "Profile" ADD COLUMN "ratingWouldAgainPct" REAL;

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "flatMatchedListing" BOOLEAN NOT NULL,
    "communication" INTEGER NOT NULL,
    "wouldSwapAgain" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rating_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rating_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_matchId_raterId_key" ON "Rating"("matchId", "raterId");
CREATE INDEX "Rating_rateeId_idx" ON "Rating"("rateeId");

-- CreateTable
CREATE TABLE "CancellationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "cancelledByUserId" TEXT NOT NULL,
    "affectedUserId" TEXT NOT NULL,
    "stayFrom" DATETIME NOT NULL,
    "cancelledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysNotice" REAL NOT NULL,
    "tier" TEXT NOT NULL,
    "feeForfeitedCredits" INTEGER NOT NULL,
    "penaltyCredits" INTEGER NOT NULL,
    "settlementReversedCredits" INTEGER NOT NULL,
    "totalCompensationCredits" INTEGER NOT NULL,
    CONSTRAINT "CancellationLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CancellationLog_matchId_idx" ON "CancellationLog"("matchId");
