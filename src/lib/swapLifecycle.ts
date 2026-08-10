// Lazy swap-lifecycle reconciliation. This repo has no cron/worker
// infrastructure, so rather than scheduled jobs, this runs defensively at
// the top of any read that touches a match whose lifecycle might have
// moved on (see /api/matches/[id]/route.ts, /api/swaps/route.ts). Two
// independent events, both idempotent:
// - Refund-eligible: one day into the agreed stay (stayFrom + 24h), each
//   side's €20 refundable portion is refunded — not held for the whole
//   stay duration, since by then the stay has demonstrably started.
// - Completed: once stayTo passes, completedSwapCount/rating-window
//   bookkeeping runs (unrelated to the refund, which already happened
//   days/weeks/months earlier for anything but a very short stay).
// Callers should still pre-filter to "either event could plausibly be
// pending" before invoking, to avoid the work on every already-processed
// historical match, but it's safe to call regardless.
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { CANCELLATION_POLICY } from "@/lib/cancellationPolicy";

const REFUND_ELIGIBLE_AFTER_MS = 24 * 60 * 60 * 1000; // one day into the stay

interface MatchForLifecycle {
  id: string;
  status: string;
  stayFrom: Date | null;
  stayTo: Date | null;
  completedProcessedAt: Date | null;
  userAId: string;
  userBId: string;
  confirmationPaymentIntentIdUserA: string | null;
  confirmationPaymentIntentIdUserB: string | null;
  refundableStatusUserA: string;
  refundableStatusUserB: string;
}

export async function processSwapLifecycleIfNeeded(match: MatchForLifecycle): Promise<void> {
  if (match.status !== "VALIDATED") return; // never validated, or cancelled — nothing to progress
  if (!match.stayFrom || !match.stayTo) return;

  const now = new Date();

  // Refund each side's €20 refundable portion once the stay is a day in,
  // if still outstanding. Kept outside any transaction since these are
  // real Stripe API calls. refundableStatusUserA/B is itself the
  // idempotency guard (flipped from PENDING to REFUNDED by a conditional
  // update below), so this is safe to re-attempt on every call — e.g.
  // after a prior transient Stripe failure — without risking a double
  // refund.
  if (now.getTime() - match.stayFrom.getTime() >= REFUND_ELIGIBLE_AFTER_MS) {
    if (match.refundableStatusUserA === "PENDING" && match.confirmationPaymentIntentIdUserA) {
      await stripe.refunds.create({
        payment_intent: match.confirmationPaymentIntentIdUserA,
        amount: CANCELLATION_POLICY.refundableCents,
      });
      await prisma.match.updateMany({
        where: { id: match.id, refundableStatusUserA: "PENDING" },
        data: { refundableStatusUserA: "REFUNDED", refundableResolvedAtUserA: now },
      });
    }
    if (match.refundableStatusUserB === "PENDING" && match.confirmationPaymentIntentIdUserB) {
      await stripe.refunds.create({
        payment_intent: match.confirmationPaymentIntentIdUserB,
        amount: CANCELLATION_POLICY.refundableCents,
      });
      await prisma.match.updateMany({
        where: { id: match.id, refundableStatusUserB: "PENDING" },
        data: { refundableStatusUserB: "REFUNDED", refundableResolvedAtUserB: now },
      });
    }
  }

  if (match.completedProcessedAt != null) return; // already processed
  if (match.stayTo > now) return; // stay hasn't ended yet

  const ratingWindowClosesAt = new Date(
    match.stayTo.getTime() + CANCELLATION_POLICY.ratingWindowDays * 24 * 60 * 60 * 1000
  );

  await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction: two concurrent requests could both
    // pass the outer guard before either writes completedProcessedAt.
    const fresh = await tx.match.findUnique({
      where: { id: match.id },
      select: { completedProcessedAt: true },
    });
    if (!fresh || fresh.completedProcessedAt != null) return;

    await Promise.all([
      tx.profile.updateMany({
        where: { userId: match.userAId },
        data: { completedSwapCount: { increment: 1 } },
      }),
      tx.profile.updateMany({
        where: { userId: match.userBId },
        data: { completedSwapCount: { increment: 1 } },
      }),
    ]);

    await tx.match.update({
      where: { id: match.id },
      data: { completedProcessedAt: now, ratingWindowClosesAt },
    });
  });
}
