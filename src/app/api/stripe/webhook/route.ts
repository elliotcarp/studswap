import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { computeSettlement } from "@/lib/matchValidation";

// POST: Stripe webhook endpoint. checkout.session.completed for a
// confirmation charge is the only trustworthy signal that a side has
// actually paid their €25 (never the client-side redirect back to
// success_url, which anyone could hit directly without paying).
// Verifies the signature so only Stripe itself can trigger this. Idempotent:
// a webhook can be delivered more than once for the same event, so this
// only marks a side confirmed once and no-ops if it's already set.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    if (checkoutSession.metadata?.purpose !== "confirmation_charge") {
      return NextResponse.json({ received: true });
    }

    const matchId = checkoutSession.metadata?.matchId;
    const side = checkoutSession.metadata?.side;
    const paymentIntentId =
      typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : null;
    if (!matchId || (side !== "A" && side !== "B") || !paymentIntentId) {
      console.error("confirmation_charge checkout.session.completed with bad metadata:", checkoutSession.id);
      return NextResponse.json({ received: true });
    }

    await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) return;

      const alreadyConfirmed = side === "A" ? match.confirmedByUserA : match.confirmedByUserB;
      if (alreadyConfirmed) return; // already handled

      const now = new Date();
      await tx.match.update({
        where: { id: matchId },
        data:
          side === "A"
            ? {
                confirmedByUserA: true,
                confirmationPaymentIntentIdUserA: paymentIntentId,
                confirmationChargedAtUserA: now,
              }
            : {
                confirmedByUserB: true,
                confirmationPaymentIntentIdUserB: paymentIntentId,
                confirmationChargedAtUserB: now,
              },
      });

      const otherSideConfirmed = side === "A" ? match.confirmedByUserB : match.confirmedByUserA;
      if (!otherSideConfirmed || !match.stayFrom || !match.stayTo) return; // still waiting on the other side (or dates)

      const { settlementAmountCents, settlementPayerId } = await computeSettlement(tx, {
        userAId: match.userAId,
        userBId: match.userBId,
        type: match.type,
        paidByUserId: match.paidByUserId,
        stayFrom: match.stayFrom,
        stayTo: match.stayTo,
        negotiatedPricePerDayCentsPaid: match.negotiatedPricePerDayCentsPaid,
        negotiatedPricePerDayCentsUserA: match.negotiatedPricePerDayCentsUserA,
        negotiatedPricePerDayCentsUserB: match.negotiatedPricePerDayCentsUserB,
      });

      // Freeze each side's current payment destination into the match right
      // as it validates, so an edit to User.paymentHandle afterward can
      // never change what the counterpart was shown for this arrangement —
      // see the Match model comment.
      const [userA, userB] = await Promise.all([
        tx.user.findUnique({ where: { id: match.userAId }, select: { paymentMethod: true, paymentHandle: true, paymentHandleAccountName: true } }),
        tx.user.findUnique({ where: { id: match.userBId }, select: { paymentMethod: true, paymentHandle: true, paymentHandleAccountName: true } }),
      ]);

      await tx.match.update({
        where: { id: matchId },
        data: {
          status: "VALIDATED",
          settlementAmountCents,
          settlementPayerId,
          paymentMethodSnapshotUserA: userA?.paymentMethod ?? null,
          paymentHandleSnapshotUserA: userA?.paymentHandle ?? null,
          paymentHandleAccountNameSnapshotUserA: userA?.paymentHandleAccountName ?? null,
          paymentMethodSnapshotUserB: userB?.paymentMethod ?? null,
          paymentHandleSnapshotUserB: userB?.paymentHandle ?? null,
          paymentHandleAccountNameSnapshotUserB: userB?.paymentHandleAccountName ?? null,
        },
      });
    });
  }

  return NextResponse.json({ received: true });
}
