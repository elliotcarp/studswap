import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// Lazily creates (or reuses) a Stripe Connect Express account for a user —
// only called once someone is actually owed a forfeiture payout, never at
// signup. This is real money StudSwap sends TO the user, so it needs a real
// payout-capable account with identity verification behind it, unlike
// User.paymentHandle (just displayed text, never touched by StudSwap).
export async function getOrCreateConnectAccount(userId: string, email: string, country: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeConnectAccountId) return user.stripeConnectAccountId;

  const account = await stripe.accounts.create({
    type: "express",
    email,
    country,
    capabilities: { transfers: { requested: true } },
    business_type: "individual",
  });

  await prisma.user.update({ where: { id: userId }, data: { stripeConnectAccountId: account.id } });
  return account.id;
}

// A Stripe-hosted onboarding link (identity, bank details) — single-use,
// short-lived, so callers should generate one fresh right before redirecting
// rather than caching it.
export async function createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });
  return link.url;
}

// Sends any still-PENDING payouts owed to this user, if their Connect
// account can actually receive transfers yet. Safe to call speculatively
// (e.g. right after a forfeiture is created, or lazily whenever a page
// touches this user's payout status) — each row's stripeTransferId is the
// idempotency guard, so this never double-sends.
export async function processPendingPayoutsForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeConnectAccountId) return;
  const accountId = user.stripeConnectAccountId;

  let payoutsEnabled = user.stripeConnectPayoutsEnabled;
  if (!payoutsEnabled) {
    // The cached flag only updates via the account.updated webhook, which
    // can be missed (a gap in local `stripe listen` forwarding, delivery
    // downtime, etc.) — self-heal by checking live, same lazy-reconciliation
    // idea as swapLifecycle.ts, so a user who's actually finished onboarding
    // is never stuck behind a webhook that never arrived.
    const account = await stripe.accounts.retrieve(accountId);
    payoutsEnabled = Boolean(account.payouts_enabled);
    if (payoutsEnabled) {
      await prisma.user.update({ where: { id: userId }, data: { stripeConnectPayoutsEnabled: true } });
    }
  }
  if (!payoutsEnabled) return;

  const pending = await prisma.forfeiturePayout.findMany({
    where: { recipientUserId: userId, status: "PENDING", stripeTransferId: null },
  });

  for (const payout of pending) {
    // Each payout is independent — one failing (or racing another caller)
    // must never stop the rest of this user's queue from being attempted.
    // lastAttemptAt is recorded either way, so the UI can tell the
    // recipient how recently this was actually retried instead of a static
    // "in progress" that never changes.
    try {
      const transfer = await stripe.transfers.create({
        amount: payout.amountCents,
        currency: "eur",
        destination: accountId,
        transfer_group: `forfeiture_${payout.matchId}`,
      });
      // Conditional update: only flips a row that's still PENDING, so two
      // concurrent callers processing the same user's queue can't double-send.
      await prisma.forfeiturePayout.updateMany({
        where: { id: payout.id, status: "PENDING" },
        data: { status: "PAID", paidAt: new Date(), stripeTransferId: transfer.id, lastAttemptAt: new Date() },
      });
    } catch (err) {
      console.error(`Forfeiture payout transfer failed for payout ${payout.id}:`, err);
      await prisma.forfeiturePayout.updateMany({
        where: { id: payout.id, status: "PENDING" },
        data: { lastAttemptAt: new Date() },
      });
    }
  }
}
