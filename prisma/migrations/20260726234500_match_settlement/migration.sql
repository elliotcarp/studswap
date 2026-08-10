-- Snapshot of the credit transfer executed at validation time, so the Your
-- swaps page has a stable historical record instead of recomputing from
-- prices that may have since changed.
ALTER TABLE "Match" ADD COLUMN "settlementCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Match" ADD COLUMN "settlementPayerId" TEXT;
