import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { createConfirmationCheckoutSession } from "@/lib/confirmationCharge";
import { computeSettlement } from "@/lib/matchValidation";
import { rateLimit } from "@/lib/rateLimit";

// POST: start the €25 confirmation charge (€5 non-refundable service fee +
// €20 refundable, refunded a day into the stay) for the current user.
// Returns a Stripe Checkout URL to redirect to — confirmedByUserA/B only
// flips once Stripe reports the payment as successful (see
// /api/stripe/webhook), never here, so a match can never be validated
// without both sides having actually paid.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!rateLimit(`confirm:${userId}`, 10, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Slow down a bit and try again shortly." }, { status: 429 });
  }

  const match = await prisma.match.findUnique({ where: { id: params.id } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status === "VALIDATED") {
    return NextResponse.json({ error: "This match is already validated" }, { status: 400 });
  }
  if (match.status === "CANCELLED") {
    return NextResponse.json({ error: "This match has been cancelled" }, { status: 400 });
  }
  if (!match.stayFrom || !match.stayTo) {
    return NextResponse.json({ error: "Agree on stay dates before confirming" }, { status: 400 });
  }

  const isUserA = match.userAId === userId;
  const alreadyConfirmed = isUserA ? match.confirmedByUserA : match.confirmedByUserB;
  if (alreadyConfirmed) {
    return NextResponse.json({ error: "You've already confirmed this match" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, paymentMethod: true, paymentHandle: true },
  });

  // Whoever is due to receive money can't confirm until they've told us how
  // to pay them — the other side is shown this handle once VALIDATED, so it
  // has to exist before that can happen. Computed from the currently agreed
  // dates/prices, same math as the frozen settlement snapshot.
  const { settlementPayerId, settlementAmountCents } = await computeSettlement(prisma, {
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
  const iAmOwedMoney = settlementAmountCents > 0 && settlementPayerId != null && settlementPayerId !== userId;
  if (iAmOwedMoney && (!user?.paymentMethod || !user?.paymentHandle)) {
    return NextResponse.json(
      { error: "Add how you'd like to be paid on your profile before confirming, the other side needs it." },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const checkoutSession = await createConfirmationCheckoutSession({
      matchId: match.id,
      userId,
      side: isUserA ? "A" : "B",
      userEmail: user?.email,
      origin,
    });
    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (err) {
    console.error("Stripe confirmation checkout session creation failed:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
