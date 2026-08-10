import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { computeSettlement } from "@/lib/matchValidation";
import { processPendingPayoutsForUser } from "@/lib/stripeConnect";

// POST: Stripe webhook endpoint.
// - checkout.session.completed for a confirmation charge is the only
//   trustworthy signal that a side has actually paid their €25 (never the
//   client-side redirect back to success_url, which anyone could hit
//   directly without paying).
// - account.updated fires whenever a connected account's status changes —
//   used to detect the moment a user's Connect Express onboarding actually
//   completes (payouts_enabled flips true), so any forfeiture payouts
//   they're owed can be sent immediately instead of waiting for them to
//   revisit the app.
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

      await tx.match.update({
        where: { id: matchId },
        data: { status: "VALIDATED", settlementAmountCents, settlementPayerId },
      });
    });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const payoutsEnabled = Boolean(account.payouts_enabled);

    const user = await prisma.user.findFirst({ where: { stripeConnectAccountId: account.id } });
    if (user && user.stripeConnectPayoutsEnabled !== payoutsEnabled) {
      await prisma.user.update({ where: { id: user.id }, data: { stripeConnectPayoutsEnabled: payoutsEnabled } });
    }
    if (user && payoutsEnabled) {
      await processPendingPayoutsForUser(user.id);
    }
  }

  return NextResponse.json({ received: true });
}
