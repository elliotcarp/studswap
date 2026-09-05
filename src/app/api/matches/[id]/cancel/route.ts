import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { CANCELLATION_POLICY, computeCancellationOutcome, daysNotice } from "@/lib/cancellationPolicy";

// POST: cancel a match. Two structurally different paths:
// - PENDING (never validated — status only reaches VALIDATED once BOTH
//   sides have paid their €25, see /api/stripe/webhook): if either side had
//   already paid before the other one did, their €20 refundable portion is
//   refunded — the €5 service fee is never refunded, even on a match that
//   never got off the ground, same as a validated one falling through.
// - VALIDATED: the affected (non-cancelling) side's €20 refundable portion
//   is always refunded immediately, since the stay isn't happening and
//   their money was never at risk. The canceller's own €20 is refunded if
//   cancelled early, or forfeited to the affected side if cancelled late
//   (see cancellationPolicy.ts) — forfeited money is never sent back
//   automatically, it becomes a ForfeiturePayout for the team to wire
//   manually (see that model's comment). Either way, nobody's €5 service
//   fee is ever refunded — it's StudSwap's revenue from the moment charged.
//   Blocked once the stay's already ended (see ratings instead).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({ where: { id: params.id } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status === "CANCELLED") {
    return NextResponse.json({ error: "This match has already been cancelled" }, { status: 400 });
  }

  const affectedUserId = match.userAId === userId ? match.userBId : match.userAId;
  const now = new Date();

  if (match.status === "PENDING") {
    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: match.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledByUserId: userId,
          lastActivityAt: now,
          lastActivityByUserId: userId,
        },
      });
      await tx.cancellationLog.create({
        data: {
          matchId: match.id,
          cancelledByUserId: userId,
          affectedUserId,
          stayFrom: match.stayFrom ?? now,
          cancelledAt: now,
          daysNotice: 0,
          outcome: "REFUNDED",
          refundableForfeitedCents: 0,
        },
      });
    });

    // Refund only the €20 refundable portion for either side that had
    // already paid — the €5 service fee is never refunded, even here (see
    // the [DECISION] note above: this only changes who the refundable
    // portion goes back to, not the fee).
    if (match.confirmationPaymentIntentIdUserA) {
      await stripe.refunds.create({
        payment_intent: match.confirmationPaymentIntentIdUserA,
        amount: CANCELLATION_POLICY.refundableCents,
      });
      await prisma.match.updateMany({
        where: { id: match.id, refundableStatusUserA: "PENDING" },
        data: { refundableStatusUserA: "REFUNDED", refundableResolvedAtUserA: now },
      });
    }
    if (match.confirmationPaymentIntentIdUserB) {
      await stripe.refunds.create({
        payment_intent: match.confirmationPaymentIntentIdUserB,
        amount: CANCELLATION_POLICY.refundableCents,
      });
      await prisma.match.updateMany({
        where: { id: match.id, refundableStatusUserB: "PENDING" },
        data: { refundableStatusUserB: "REFUNDED", refundableResolvedAtUserB: now },
      });
    }

    return NextResponse.json({ outcome: "REFUNDED", forfeitedCents: 0 });
  }

  // status === "VALIDATED"
  const stayFrom = match.stayFrom;
  const stayTo = match.stayTo;
  if (!stayFrom || !stayTo) {
    return NextResponse.json({ error: "This match has no agreed stay dates" }, { status: 400 });
  }
  if (match.completedProcessedAt != null || stayTo < now) {
    return NextResponse.json(
      { error: "This stay has already happened, see ratings instead" },
      { status: 400 }
    );
  }

  const notice = daysNotice(now, stayFrom);
  const isUserA = match.userAId === userId;
  const myPaymentIntentId = isUserA
    ? match.confirmationPaymentIntentIdUserA
    : match.confirmationPaymentIntentIdUserB;
  const theirPaymentIntentId = isUserA
    ? match.confirmationPaymentIntentIdUserB
    : match.confirmationPaymentIntentIdUserA;
  if (!myPaymentIntentId || !theirPaymentIntentId) {
    return NextResponse.json({ error: "Missing confirmation charge record for this match" }, { status: 500 });
  }
  const myRefundableStatus = isUserA ? match.refundableStatusUserA : match.refundableStatusUserB;
  const theirRefundableStatus = isUserA ? match.refundableStatusUserB : match.refundableStatusUserA;
  // The €20 auto-refunds a day into the stay regardless of cancellation
  // (see swapLifecycle.ts) — that happens well before the notice cutoff
  // could ever call this "early," so by the time a cancellation lands
  // "late" by days-before-stayFrom, my own €20 may well have already been
  // refunded back to me. There's nothing left to forfeit at that point:
  // treat it as REFUNDED (already happened), not FORFEITED.
  const outcome = myRefundableStatus === "PENDING" ? computeCancellationOutcome(now, stayFrom) : "REFUNDED";

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledByUserId: userId,
        lastActivityAt: now,
        lastActivityByUserId: userId,
      },
    });

    if (outcome === "FORFEITED") {
      await tx.forfeiturePayout.create({
        data: {
          matchId: match.id,
          recipientUserId: affectedUserId,
          amountCents: CANCELLATION_POLICY.refundableCents,
        },
      });
    }

    await tx.cancellationLog.create({
      data: {
        matchId: match.id,
        cancelledByUserId: userId,
        affectedUserId,
        stayFrom,
        cancelledAt: now,
        daysNotice: notice,
        outcome,
        refundableForfeitedCents: outcome === "FORFEITED" ? CANCELLATION_POLICY.refundableCents : 0,
      },
    });
  });

  // Real Stripe calls, kept outside the transaction above and guarded by
  // both a refundableStatus PENDING check (so an already-auto-refunded side
  // — see swapLifecycle.ts — is never refunded twice) and a conditional
  // update on the way out, same idempotency pattern as swapLifecycle.ts.
  // Each side's outcome is handled independently and wrapped so a failure
  // on one (a transient Stripe error, a payout with no Connect account yet)
  // can never prevent the other from being recorded — the DB transaction
  // above already committed the cancellation itself either way. Known
  // limitation: a failed refund here is left at PENDING with no automatic
  // retry — there's no cron/worker in this repo to pick it back up, so a
  // failure needs manual follow-up.
  if (theirRefundableStatus === "PENDING") {
    try {
      await stripe.refunds.create({ payment_intent: theirPaymentIntentId, amount: CANCELLATION_POLICY.refundableCents });
      await prisma.match.updateMany({
        where: { id: match.id, [isUserA ? "refundableStatusUserB" : "refundableStatusUserA"]: "PENDING" },
        data: isUserA
          ? { refundableStatusUserB: "REFUNDED", refundableResolvedAtUserB: now }
          : { refundableStatusUserA: "REFUNDED", refundableResolvedAtUserA: now },
      });
    } catch (err) {
      console.error("Cancellation refund failed for the non-cancelling side:", err);
    }
  }

  if (outcome === "REFUNDED" && myRefundableStatus === "PENDING") {
    try {
      await stripe.refunds.create({ payment_intent: myPaymentIntentId, amount: CANCELLATION_POLICY.refundableCents });
      await prisma.match.updateMany({
        where: { id: match.id, [isUserA ? "refundableStatusUserA" : "refundableStatusUserB"]: "PENDING" },
        data: isUserA
          ? { refundableStatusUserA: outcome, refundableResolvedAtUserA: now }
          : { refundableStatusUserB: outcome, refundableResolvedAtUserB: now },
      });
    } catch (err) {
      console.error("Cancellation refund failed for the cancelling side:", err);
    }
  } else if (outcome === "FORFEITED") {
    // myRefundableStatus is guaranteed PENDING here (see the outcome
    // derivation above), so no guard needed on this write. The
    // ForfeiturePayout row created above is left PENDING — it's paid by
    // manual bank transfer, not an automated transfer, see ForfeiturePayout
    // model comment and /api/admin.
    await prisma.match.update({
      where: { id: match.id },
      data: isUserA
        ? { refundableStatusUserA: "FORFEITED", refundableResolvedAtUserA: now }
        : { refundableStatusUserB: "FORFEITED", refundableResolvedAtUserB: now },
    });
  }

  return NextResponse.json({
    outcome,
    forfeitedCents: outcome === "FORFEITED" ? CANCELLATION_POLICY.refundableCents : 0,
  });
}
