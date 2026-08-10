import Stripe from "stripe";

// Server-only Stripe client. STRIPE_SECRET_KEY is a test-mode key for now —
// get a lawyer to review the €25 confirmation-charge terms (service fee vs.
// refundable portion, forfeiture on late cancellation) before ever switching
// to a live key.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
