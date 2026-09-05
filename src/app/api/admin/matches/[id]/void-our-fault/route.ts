import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getAdminEmail } from "@/lib/adminAuth";
import { confirmationChargeTotalCents } from "@/lib/cancellationPolicy";

// POST: admin-triggered full refund when a match can't go ahead because of
// a fault on StudSwap's side (a bug, a wrongful suspension, a payment
// problem attributable to us) — both sides get their full €25 back,
// including the normally-non-refundable €5 service fee, per the Fees
// policy §6 / Terms §13. Distinct from the notice-based cancellation flow
// (/api/matches/[id]/cancel): nobody forfeits anything, no ForfeiturePayout
// is created. Scoped to matches that haven't already had a refund or
// forfeiture processed on either side, since this is meant to void a still-
// active arrangement, not unwind one that's already resolved.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const match = await prisma.match.findUnique({ where: { id: params.id } });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "VALIDATED") {
    return NextResponse.json({ error: "Only a validated match can be voided this way" }, { status: 400 });
  }
  if (match.refundableStatusUserA !== "PENDING" || match.refundableStatusUserB !== "PENDING") {
    return NextResponse.json(
      { error: "This match already had a refund or forfeiture processed — handle it manually" },
      { status: 400 }
    );
  }

  const now = new Date();
  const totalCents = confirmationChargeTotalCents();

  for (const paymentIntentId of [match.confirmationPaymentIntentIdUserA, match.confirmationPaymentIntentIdUserB]) {
    if (!paymentIntentId) continue;
    await stripe.refunds.create({ payment_intent: paymentIntentId, amount: totalCents });
  }

  // CancellationLog.cancelledByUserId is not meaningful for OUR_FAULT rows —
  // neither user actually cancelled, StudSwap did. It's left pointing at the
  // other user only because the column is required and non-attributive here;
  // any UI reading these rows must branch on outcome === "OUR_FAULT" first,
  // before ever using cancelledByUserId to say who cancelled.
  await prisma.$transaction([
    prisma.match.update({
      where: { id: match.id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledByUserId: null,
        refundableStatusUserA: "REFUNDED",
        refundableResolvedAtUserA: now,
        refundableStatusUserB: "REFUNDED",
        refundableResolvedAtUserB: now,
      },
    }),
    prisma.cancellationLog.create({
      data: {
        matchId: match.id,
        cancelledByUserId: match.userAId,
        affectedUserId: match.userBId,
        stayFrom: match.stayFrom ?? now,
        cancelledAt: now,
        daysNotice: 0,
        outcome: "OUR_FAULT",
        refundableForfeitedCents: 0,
      },
    }),
    prisma.cancellationLog.create({
      data: {
        matchId: match.id,
        cancelledByUserId: match.userBId,
        affectedUserId: match.userAId,
        stayFrom: match.stayFrom ?? now,
        cancelledAt: now,
        daysNotice: 0,
        outcome: "OUR_FAULT",
        refundableForfeitedCents: 0,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
