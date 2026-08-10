# StudSwap

Mobile-first, swipe-based student flat-swap MVP.

## Stack

- **Next.js 14** (App Router, TypeScript): frontend + backend in one project
- **Tailwind CSS**: mobile-first styling
- **Framer Motion**: swipe-card drag gestures
- **Prisma + SQLite** (dev), **Postgres/Neon** (prod): database
- **Auth.js (NextAuth) Email provider**: passwordless magic-link login, gated by a university email allow-list
- **Vercel Blob**: flat photo storage
- **Vercel**: deployment

## Project structure

```
src/
  app/
    page.tsx                 # landing page
    (auth)/signup/page.tsx   # email entry -> magic link
    (auth)/verify/page.tsx   # "check your email" screen
    onboarding/page.tsx      # profile creation (name, city, photos, dates, bio)
    swipe/page.tsx           # main swipe stack
    matches/page.tsx         # list of mutual matches
    matches/[id]/page.tsx    # simple polling-based chat
    api/
      auth/[...nextauth]/route.ts
      profile/route.ts       # GET candidates, POST create/update profile
      swipe/route.ts         # POST swipe, detects mutual match
      matches/route.ts       # GET current user's matches
  components/
    SwipeCardStack.tsx        # drag/swipe logic
    ProfileCard.tsx            # single card UI
    Navbar.tsx                  # bottom tab bar
  lib/
    prisma.ts               # Prisma client singleton
    auth.ts                 # NextAuth config + domain-check callback
    allowedDomains.ts       # manually maintained university domain allow-list
  types/index.ts
prisma/
  schema.prisma            # User, Profile, Swipe, Match, Message + Auth.js tables
```

## Local setup

1. `npm install`
2. `cp .env.example .env` and fill in values (SQLite `DATABASE_URL` works out of the box for local dev)
3. `npx prisma migrate dev --name init`
4. `npm run dev`

## Deploying

1. Push to GitHub, import into Vercel
2. Provision a free [Neon](https://neon.tech) Postgres database, set `DATABASE_URL` in Vercel env vars, change `provider` in `schema.prisma` to `"postgresql"`, run `npx prisma migrate deploy`
3. Set up an SMTP provider (e.g. Resend) for magic-link emails, add its env vars
4. Enable Vercel Blob storage in the Vercel dashboard, copy the `BLOB_READ_WRITE_TOKEN`

## Status

This is a scaffold: folder structure, data model, config, and typed stubs are in place.
No feature logic is implemented yet (see `TODO` comments in each file). Next step is
implementing features in this order:

1. Signup + domain check + onboarding form (profile creation, photo upload)
2. Swipe stack UI + `/api/profile` (candidates) + `/api/swipe` (record + match detection)
3. Matches list + simple polling chat
