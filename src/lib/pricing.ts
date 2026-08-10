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

export function totalStayPriceCents(
  pricePerDayCents: number,
  availableFrom: Date,
  availableTo: Date
): number {
  return pricePerDayCents * stayDurationDays(availableFrom, availableTo);
}
