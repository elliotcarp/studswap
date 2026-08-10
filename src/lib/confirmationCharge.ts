import { stripe } from "@/lib/stripe";
import { CANCELLATION_POLICY, confirmationChargeTotalCents } from "@/lib/cancellationPolicy";

// Creates the €25 confirmation charge (€5 non-refundable service fee + €20
// refundable, refunded a day into the stay) for one side of a match.
// One Checkout Session per user per match — the webhook (see
// /api/stripe/webhook) marks that side confirmed only once Stripe reports
// the payment as successful, so a match is never VALIDATED without both
// charges having actually gone through. This money belongs to StudSwap from
// the moment it's charged; the app never holds it "for" the user.
export async function createConfirmationCheckoutSession({
  matchId,
  userId,
  side,
  userEmail,
  origin,
}: {
  matchId: string;
  userId: string;
  side: "A" | "B";
  userEmail?: string | null;
  origin: string;
}) {
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: userEmail ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: confirmationChargeTotalCents(),
          product_data: {
            name: "StudSwap confirmation charge",
            description: `€${CANCELLATION_POLICY.serviceFeeCents / 100} service fee (non-refundable) + €${CANCELLATION_POLICY.refundableCents / 100} refundable, refunded a day into the stay`,
          },
        },
        quantity: 1,
      },
    ],
    // Opting out of Stripe's Managed Payments (which requires a product tax
    // code) rather than mis-tagging this — same pattern as the removed
    // Credits top-up flow used.
    managed_payments: { enabled: false },
    metadata: { purpose: "confirmation_charge", matchId, userId, side },
    success_url: `${origin}/matches/${matchId}?confirm=success`,
    cancel_url: `${origin}/matches/${matchId}?confirm=cancelled`,
  });
}
