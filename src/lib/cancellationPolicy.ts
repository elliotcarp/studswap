// Tunable knobs for the €25 confirmation charge and its cancellation
// outcome (see /api/matches/[id]/cancel/route.ts). All numbers live here,
// never inlined in route code, so they can be retuned without touching logic.
export const CANCELLATION_POLICY = {
  // Cancel more than this many days before stayFrom: the canceller's €20
  // refundable portion is refunded. On or after this cutoff (including
  // after stayFrom has passed): it's forfeited to the other side instead.
  // [DECISION] flagged: the old system had three tiers scaled against a
  // settlement amount that no longer moves as real money, so there's
  // nothing left to scale a percentage penalty off of. This collapses to a
  // single binary cutoff — adjust here if a different notice period is
  // wanted.
  freeCancelDaysBeforeStay: 7,
  // StudSwap's non-refundable service fee, part of the €25 charged to each
  // side at confirmation. This is StudSwap's revenue from the moment it's
  // charged — never refunded, never forfeited (there's nothing to forfeit,
  // it was never the user's to keep).
  serviceFeeCents: 500,
  // The refundable portion of the €25 charge. StudSwap's money from the
  // moment it's charged, subject to a contractual promise to refund it on
  // completion — never a deposit, escrow, or balance held "for" the user.
  refundableCents: 2000,
  // How long after a swap's stayTo passes both sides can still submit a
  // rating for it (see swapLifecycle.ts).
  ratingWindowDays: 14,
};

export type CancellationOutcome = "REFUNDED" | "FORFEITED";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Days of notice before the stay was due to start; negative once stayFrom
// has already passed.
export function daysNotice(now: Date, stayFrom: Date): number {
  return (stayFrom.getTime() - now.getTime()) / MS_PER_DAY;
}

// Only the canceller's own €20 refundable portion is ever at stake — see
// CancellationLog. The other side's €20 is always refunded immediately
// either way, since the stay isn't happening.
export function computeCancellationOutcome(now: Date, stayFrom: Date): CancellationOutcome {
  const notice = daysNotice(now, stayFrom);
  return notice > CANCELLATION_POLICY.freeCancelDaysBeforeStay ? "REFUNDED" : "FORFEITED";
}

export function confirmationChargeTotalCents(): number {
  return CANCELLATION_POLICY.serviceFeeCents + CANCELLATION_POLICY.refundableCents;
}
