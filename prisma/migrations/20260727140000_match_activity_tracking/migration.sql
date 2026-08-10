-- Unified "is there something new here" tracking: bumped on match
-- creation and every message/propose/confirm/cancel, replacing the old
-- messages-only unread check (see /api/notifications, /api/matches, /api/likes).
ALTER TABLE "Match" ADD COLUMN "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Match" ADD COLUMN "lastActivityByUserId" TEXT;
