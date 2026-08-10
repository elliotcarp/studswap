# StudSwap

Mobile-first, swipe-based platform for students to swap flats with each other for a stay abroad — or book a one-directional stay at someone else's place. Think Tinder for housing swaps, with a real payment and cancellation lifecycle behind the match.

## How it works

1. **Sign up** with a university email — magic link or password, gated by a domain allow-list.
2. **Swipe** through other students' flat listings. Swipe right on someone who also swiped right on you and it's a **mutual match**; or **like someone directly to pay for a one-directional stay** at their place without them needing to swap back.
3. **Chat, propose dates and a price**, and confirm. Each side pays a flat confirmation charge through Stripe; the match is only validated once both charges succeed.
4. **After the stay**, both sides rate each other. Cancelling late forfeits part of your confirmation charge to the other side, paid out via Stripe Connect.

## Features

- **University-gated auth**: passwordless magic-link and password sign-in (Auth.js), checked against a sourced list of 2,200+ European university email domains. Domains not on the list fall back to an LLM check (Claude, via the Anthropic API) that judges whether a domain looks academic — fails closed if the check is unavailable or ambiguous.
- **Onboarding**: profile creation with separate self/flat photo sets, availability window, per-day price, and free-text prompts (à la Hinge).
- **Swipe stack** with mutual-match detection, plus a **"Liked" page** for one-directional connections — pay to book someone's flat without a reciprocal swipe.
- **In-chat negotiation**: propose/confirm stay dates and a negotiated price per day before committing.
- **Real payment confirmation**: a flat €25 charge per side (€5 non-refundable service fee + €20 refundable) via Stripe Checkout Sessions, webhook-verified — a match only becomes `VALIDATED` once both charges have actually succeeded.
- **Cancellation policy**: notice-based refund vs. forfeiture of the refundable portion, with an append-only audit log per cancellation for dispute reference.
- **Forfeiture payouts**: money forfeited by a cancelling side is owed to the other side and paid out via a real Stripe Connect transfer once they've onboarded a payout-capable account.
- **Post-stay ratings**: blind until both sides submit (or the rating window closes), feeding a denormalized rating aggregate shown on profiles.
- **Unread-activity tracking** across matches and likes (new message, proposal, confirmation, or cancellation).
- Legal docs (Terms, Privacy Policy, Peer Swap Agreement) wired into onboarding acceptance — working drafts, not yet lawyer-reviewed.

## Tech Stack

- **Next.js 14** (App Router, TypeScript) — frontend + backend in one project
- **Tailwind CSS** + **Framer Motion** — mobile-first styling and swipe-card drag gestures
- **Prisma** + SQLite (dev) / **Postgres on Neon** (prod)
- **Auth.js (NextAuth)** — Email (magic link) and Credentials providers
- **Stripe** — Checkout Sessions for confirmation charges, Connect for forfeiture payouts, webhook-driven state
- **Anthropic API (Claude)** — structured-output fallback for university domain verification
- **Vercel Blob** — flat/profile photo storage
- **Vercel** — deployment

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
    api/
      auth/                       # NextAuth, registration, terms acceptance
      swipe/, likes/, matches/    # swiping, matching, chat, propose/confirm/cancel
      stripe/webhook/             # confirmation-charge payment confirmation
      user/payouts/onboard/       # Stripe Connect onboarding for forfeiture payouts
  lib/
    auth.ts, allowedDomains.ts, aiDomainCheck.ts  # auth + domain gating
    confirmationCharge.ts, cancellationPolicy.ts  # payment + cancellation logic
    stripeConnect.ts, swapLifecycle.ts            # payouts + post-stay reconciliation
prisma/
  schema.prisma   # User, Profile, Swipe, Match, Message, Rating, CancellationLog, ForfeiturePayout
```

## Local setup

1. `npm install`
2. `cp .env.example .env` and fill in values (SQLite `DATABASE_URL` works out of the box for local dev; without `ANTHROPIC_API_KEY` set, domains outside the static allow-list are simply rejected)
3. `npx prisma migrate dev`
4. `npm run dev`

## Deploying

1. Push to GitHub, import into Vercel
2. Provision a [Neon](https://neon.tech) Postgres database, set `DATABASE_URL` in Vercel env vars, switch `provider` in `schema.prisma` to `"postgresql"`, run `npx prisma migrate deploy`
3. Set up an SMTP provider (e.g. Resend) for magic-link emails
4. Enable Vercel Blob storage, add live Stripe keys, and set `ANTHROPIC_API_KEY` if you want the AI domain fallback

## Status

Functional MVP — the flows above are implemented end to end, including the Stripe payment/webhook lifecycle and the cancellation/payout logic. Not yet lawyer-reviewed (see `legal/`), and Stripe/Anthropic keys need to be supplied to run the paid flows and the AI domain fallback locally.
