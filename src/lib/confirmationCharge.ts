import { stripe } from "@/lib/stripe";
import { CANCELLATION_POLICY, confirmationChargeTotalCents } from "@/lib/cancellationPolicy";

const IDEMPOTENCY_BUCKET_MS = 10 * 60 * 1000;

// Deterministic per (match, side) within a short time bucket: a rapid
// double-click or two open tabs both hitting "Confirm" produce the SAME key,
// so Stripe returns the same Checkout Session instead of creating a second
// €25 charge for the same person. Bucketed (not permanently stable) so a
// genuinely later retry — e.g. the first Checkout Session expired unpaid and
// they come back the next day — gets a fresh session instead of being stuck
// replaying a dead one forever. Exported (rather than inlined) so this is
// unit-testable without going through Stripe.
export function confirmIdempotencyKey(matchId: string, side: "A" | "B", now: Date = new Date()): string {
  return `confirm_${matchId}_${side}_${Math.floor(now.getTime() / IDEMPOTENCY_BUCKET_MS)}`;
}

// Creates the €25 confirmation charge (€5 service fee + €20 for
// cancellation insurance, refunded a day into the stay) for one side of a match.
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
  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: userEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: confirmationChargeTotalCents(),
            product_data: {
              name: "StudSwap confirmation charge",
              description: `€${CANCELLATION_POLICY.serviceFeeCents / 100} service fee + €${CANCELLATION_POLICY.refundableCents / 100} for cancellation insurance, refunded a day into the stay`,
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
    },
    // This is on top of, not instead of, the webhook's own DB-level
    // idempotency (see /api/stripe/webhook), which only stops a duplicate
    // *event delivery* from double-counting, not Stripe from ever issuing a
    // second charge in the first place.
    { idempotencyKey: confirmIdempotencyKey(matchId, side) }
  );
}
