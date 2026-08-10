-- Add the agree-on-dates / confirm-by-both-sides validation flow to Match.
ALTER TABLE "Match" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Match" ADD COLUMN "stayFrom" DATETIME;
ALTER TABLE "Match" ADD COLUMN "stayTo" DATETIME;
ALTER TABLE "Match" ADD COLUMN "confirmedByUserA" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Match" ADD COLUMN "confirmedByUserB" BOOLEAN NOT NULL DEFAULT false;

-- Existing matches were created (and already had credits settled) under the
-- old instant-compensation model. Mark them already-validated so they aren't
-- stuck waiting on a retroactive agreement neither side actually made.
UPDATE "Match" SET "status" = 'VALIDATED', "confirmedByUserA" = true, "confirmedByUserB" = true;
