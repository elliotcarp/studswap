# StudSwap

Mobile-first, swipe-based platform for students to swap flats with each other for a stay abroad, or book a one-directional stay at someone else's place. Think Tinder for housing swaps, with a real payment and cancellation lifecycle behind the match.

## How it works

1. **Sign up** with a university email using a magic link or password, gated by a domain allow-list.
2. **Swipe** through other students' flat listings. Swipe right on someone who also swiped right on you and it's a **mutual match**; or **like someone directly to pay for a one-directional stay** at their place without them needing to swap back.
3. **Chat, propose dates and a price**, and confirm. Each side pays a flat confirmation charge through Stripe; the match is only validated once both charges succeed.
4. **After the stay**, both sides rate each other. StudSwap only ever charges and moves its own €25 fee, never the money the two of you owe each other for the stay itself, that's paid directly between you, off-platform.

## Features

- **University-gated auth**: passwordless magic-link and password sign-in (Auth.js), checked against a sourced list of 2,200+ European university email domains. Domains not on the list fall back to an LLM check (Claude, via the Anthropic API) that judges whether a domain looks academic, and fails closed if the check is unavailable or ambiguous.
- **Onboarding**: profile creation with separate self/flat photo sets, availability window, per-day price, payment destination, short-term rental registration number, and free-text prompts (à la Hinge).
- **Swipe stack** with mutual-match detection, plus a "Liked" page for one-directional connections: pay to book someone's flat without a reciprocal swipe.
- **In-chat negotiation**: propose/confirm stay dates and a negotiated price per day before committing.
- **Real payment confirmation**: a flat €25 charge per side (€5 non-refundable service fee + €20 refundable) via Stripe Checkout Sessions, webhook-verified and idempotency-keyed against double charges. A match only becomes `VALIDATED` once both charges have actually succeeded, at which point each side's payment destination is frozen into the match so a later edit can't change what the other side sees.
- **StudSwap never touches the money you owe each other**: it's calculated and displayed only, settled directly between the two users, who can each mark it paid/received and report a problem if it doesn't happen as expected.
- **Cancellation policy**: notice-based refund vs. forfeiture of the refundable portion (plus StudSwap-funded compensation to the other side), an admin-triggered full refund for StudSwap's own faults, and an append-only audit log per cancellation for dispute reference.
- **No-show reporting**: failing to give access counts as a cancellation at the moment access was due, forfeiting the refundable portion the same way a late cancellation does.
- **Forfeiture payouts**: money StudSwap owes the other side after a late cancellation or no-show is paid by manual bank transfer (not an automated Connect transfer) via the internal `/admin` dashboard, deliberately, at this scale a payment rail is the exact problem this rework removed.
- **Post-stay ratings**: blind until both sides submit (or the rating window closes), feeding a denormalized rating aggregate shown on profiles.
- **Unread-activity tracking** across matches and likes (new message, proposal, confirmation, or cancellation).
- Legal docs (Terms, Fees and Refunds Policy, Privacy Policy, Peer Swap Agreement) wired into onboarding acceptance (working drafts, not yet lawyer-reviewed).

## Tech Stack

- **Next.js 14** (App Router, TypeScript): frontend and backend in one project
- **Tailwind CSS** and **Framer Motion**: mobile-first styling and swipe-card drag gestures
- **Prisma** with SQLite (dev) / **Postgres on Neon** (prod)
- **Auth.js (NextAuth)**: Email (magic link) and Credentials providers
- **Stripe**: Checkout Sessions for the €25 confirmation charge, webhook-driven state. No Connect, no stored balance, no other money moves through Stripe.
- **Anthropic API (Claude)**: structured-output fallback for university domain verification
- **Vercel Blob**: flat/profile photo storage
- **Vitest**: unit + integration tests for the payment/cancellation logic (`npm run test`)
- **Vercel**: deployment

## Project structure

```
src/
  app/
    (auth)/signup, verify         # email entry -> magic link / password
    onboarding/                   # profile creation wizard
    swipe/                        # main swipe stack
    liked/                        # pending likes + one-directional connections
    matches/[id]/                 # chat, propose/confirm dates, ratings, cancellation
    swaps/                        # completed/validated swap history
    admin/                        # internal: payouts owed, no-show/dispute reports, manual full-refund
    fees/, terms/, privacy/, peer-agreement/  # legal doc pages, rendered from legal/*.md
    api/
      auth/                       # NextAuth, registration, terms acceptance
      swipe/, likes/, matches/    # swiping, matching, chat, propose/confirm/cancel/report-no-show
      stripe/webhook/             # confirmation-charge payment confirmation
      admin/                      # payouts, no-show/dispute reports, void-our-fault, registration export
  lib/
    auth.ts, allowedDomains.ts, aiDomainCheck.ts  # auth + domain gating
    confirmationCharge.ts, cancellationPolicy.ts  # payment + cancellation logic
    noShow.ts, settlementReminders.ts, swapLifecycle.ts  # no-shows, in-app reminders, lazy reconciliation
    adminAuth.ts                                  # ADMIN_EMAILS allow-list gate for /admin
prisma/
  schema.prisma   # User, Profile, Swipe, Match, Message, Rating, CancellationLog, ForfeiturePayout
```

## Local setup

1. `npm install`
2. `cp .env.example .env` and fill in values (SQLite `DATABASE_URL` works out of the box for local dev; without `ANTHROPIC_API_KEY` set, domains outside the static allow-list are simply rejected; set `ADMIN_EMAILS` to your own sign-in email to reach `/admin`)
3. `npx prisma migrate dev`
4. `npm run dev`
5. `npm run test` runs the payment/cancellation logic tests

## Deploying

1. Push to GitHub, import into Vercel
2. Provision a [Neon](https://neon.tech) Postgres database, set `DATABASE_URL` in Vercel env vars, switch `provider` in `schema.prisma` to `"postgresql"`, run `npx prisma migrate deploy`
3. Set up an SMTP provider (e.g. Resend) for magic-link emails
4. Enable Vercel Blob storage, add live Stripe keys, and set `ANTHROPIC_API_KEY` if you want the AI domain fallback

## Status

Functional MVP. The flows above are implemented end to end, including the Stripe payment/webhook lifecycle and the cancellation/no-show/payout logic. Payment reminders are computed and shown in-app when a match page loads; there's no cron/worker or outbound email beyond the dev-mode magic-link console log, so nothing is sent proactively yet. Not yet lawyer-reviewed (see `legal/`), and Stripe/Anthropic keys need to be supplied to run the paid flows and the AI domain fallback locally.
