// Shared helpers for turning a per-day price (in cents) into a total stay
// cost, based on the flat's own listed availability window. Used for both
// the fairness-difference display (mutual matches) and the full stay-cost
// display (one-directional "paid" unlocks). This is informational only —
// StudSwap calculates and displays these numbers but never charges, holds,
// or transfers them; the two users settle directly between themselves.

export function stayDurationDays(availableFrom: Date, availableTo: Date): number {
  const ms = availableTo.getTime() - availableFrom.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// A stay this long or longer counts as a "long stay" (see
// Profile.pricePerMonthCents) and prices off the monthly rate instead of
// the day rate, when one's set.
export const LONG_STAY_THRESHOLD_DAYS = 30;

// The actual price/day-vs-price/month decision, factored out from
// totalStayPriceCents so callers that already have a day count (rather than
// two Dates) — e.g. TripDetails' live draft preview — can use the same rule
// without a round trip through Date math. Prorated by night count rather
// than a flat one-month price, so a 45-night stay isn't priced the same as
// a 30-night one.
export function estimatedTotalCents(
  pricePerDayCents: number,
  days: number,
  pricePerMonthCents?: number | null
): number {
  if (pricePerMonthCents != null && days >= LONG_STAY_THRESHOLD_DAYS) {
    return Math.round(pricePerMonthCents * (days / LONG_STAY_THRESHOLD_DAYS));
  }
  return pricePerDayCents * days;
}

export function totalStayPriceCents(
  pricePerDayCents: number,
  availableFrom: Date,
  availableTo: Date,
  pricePerMonthCents?: number | null
): number {
  return estimatedTotalCents(pricePerDayCents, stayDurationDays(availableFrom, availableTo), pricePerMonthCents);
}

// Most students think in monthly rent, not a per-night rate, and get stuck
// staring at the per-day field in onboarding. Ballpark it off the same
// 30-day month the rest of this file already prices long stays against
// (see LONG_STAY_THRESHOLD_DAYS/estimatedTotalCents), so the hint and the
// actual long-stay math never disagree with each other. Purely a starting
// suggestion — the field stays editable, this never touches settlement math.
export function estimateDayRateFromMonthlyRentCents(monthlyRentCents: number): number {
  return Math.max(1, Math.round(monthlyRentCents / LONG_STAY_THRESHOLD_DAYS));
}

// A peer damage/security deposit is never collected or held by StudSwap
// (see Peer Swap Agreement §1/§5.4) — this is only a suggested starting
// number for the two users to agree on directly, shown alongside the
// Damage Deposit Agreement template. Scaled off a few nights' rent (so a
// pricier place suggests a proportionately bigger deposit) but bounded:
// below €50 isn't worth the hassle, above €300 stops looking like a peer
// arrangement and starts looking like a landlord's deposit.
const DEPOSIT_NIGHTS_MULTIPLE = 3;
const MIN_DEPOSIT_CENTS = 5000;
const MAX_DEPOSIT_CENTS = 30000;
const DEPOSIT_ROUNDING_CENTS = 500;

export function estimateSuggestedDepositCents(pricePerDayCents: number): number {
  const raw = pricePerDayCents * DEPOSIT_NIGHTS_MULTIPLE;
  const rounded = Math.round(raw / DEPOSIT_ROUNDING_CENTS) * DEPOSIT_ROUNDING_CENTS;
  return Math.min(MAX_DEPOSIT_CENTS, Math.max(MIN_DEPOSIT_CENTS, rounded));
}
