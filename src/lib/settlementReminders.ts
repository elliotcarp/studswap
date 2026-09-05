// In-app reminder staging for the off-platform settlement payment (see
// Match.settlementMarkedPaidByPayer/settlementConfirmedReceivedByPayee).
// This repo has no cron/worker and no outbound email beyond the dev-mode
// magic-link console log (see swapLifecycle.ts's own comment on the same
// constraint), so "remind them" is implemented the same way the rest of the
// swap lifecycle already is: computed lazily from timestamps whenever a
// page loads, not a scheduled job or a sent email. This is a deliberate
// scope decision, not an oversight — see the payments-rework plan notes.
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type SettlementReminderStage = "DUE" | "OVERDUE_3D" | "OVERDUE_7D" | null;

export function settlementReminderStage(
  now: Date,
  stayFrom: Date | null,
  settlementAmountCents: number,
  settled: boolean
): SettlementReminderStage {
  if (settled || settlementAmountCents <= 0 || !stayFrom) return null;
  const daysSinceStart = (now.getTime() - stayFrom.getTime()) / MS_PER_DAY;
  if (daysSinceStart < 1) return null; // payment is due 24h after the stay starts, not before
  if (daysSinceStart >= 7) return "OVERDUE_7D";
  if (daysSinceStart >= 3) return "OVERDUE_3D";
  return "DUE";
}
