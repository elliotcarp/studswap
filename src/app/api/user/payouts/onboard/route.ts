import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getOrCreateConnectAccount, createOnboardingLink } from "@/lib/stripeConnect";

// Common home markets for StudSwap's university allow-list (see
// allowedDomains.ts) — Stripe Express account country is set once at
// creation and can't change later, so ask for it explicitly rather than
// guessing from an email domain or IP.
const SUPPORTED_COUNTRIES = [
  "DE", "FR", "IT", "ES", "PT", "NL", "BE", "AT", "CH", "IE",
  "DK", "SE", "FI", "PL", "CZ", "HU", "GR", "LU", "GB",
] as const;

const schema = z.object({
  country: z.enum(SUPPORTED_COUNTRIES),
  // Where to send the user back to once onboarding finishes — a matchId, so
  // the cancelled-swap card that prompted this can pick up where it left off.
  returnTo: z.string().min(1),
});

// POST { country, returnTo }: creates (or reuses) this user's Stripe Connect
// Express account and returns a fresh onboarding link to redirect to. Only
// ever called when the user is actually owed a forfeiture payout — see
// TripDetails.tsx's cancelled-swap card.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const returnUrl = `${origin}/matches/${parsed.data.returnTo}?payout=onboarded`;

  try {
    const accountId = await getOrCreateConnectAccount(userId, user.email, parsed.data.country);
    const url = await createOnboardingLink(accountId, returnUrl, returnUrl);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Stripe Connect onboarding link creation failed:", err);
    return NextResponse.json({ error: "Could not start payout setup. Please try again." }, { status: 502 });
  }
}
