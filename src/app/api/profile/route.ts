import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  ACCOMMODATES_OPTIONS,
  MAX_SELF_PHOTO_COUNT,
  MAX_FLAT_PHOTO_COUNT,
  accommodatesLabelToInt,
} from "@/lib/onboardingOptions";
import { EUROPEAN_CITIES } from "@/lib/cities";
import { MAX_PROMPT_COUNT, MIN_PROMPT_COUNT, PROMPTS } from "@/lib/prompts";
import { toProfileCardData } from "@/lib/profileMapping";
import type { ProfileCardData } from "@/types";

const promptSchema = z.object({
  question: z.enum(PROMPTS as [string, ...string[]]),
  answer: z.string().trim().min(1).max(300),
});

const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    age: z.coerce.number().int().min(16, "Age must be at least 16").max(99, "Enter a valid age"),
    university: z.string().trim().min(1, "University is required").max(100),
    program: z.string().trim().min(1, "Field of study is required").max(100),
    yearOfStudy: z.string().trim().min(1, "Year of study is required"),
    homeCity: z.enum(EUROPEAN_CITIES as [string, ...string[]], {
      errorMap: () => ({ message: "Pick a city from the list" }),
    }),
    // Optional: not everyone will want to add this right away, and it's
    // never shown publicly anyway (see ProfileCard's showAddress prop), only
    // to the other side of a confirmed match.
    address: z.string().trim().max(200),
    availableFrom: z.coerce.date(),
    availableTo: z.coerce.date(),
    accommodates: z.enum(ACCOMMODATES_OPTIONS as [string, ...string[]]),
    // In cents. StudSwap never collects or moves this money — it's only
    // used to calculate and display the stay cost / fairness difference
    // between two profiles, see Match.settlementAmountCents.
    pricePerDayCents: z.coerce
      .number()
      .int()
      .min(100, "Set a price of at least €1/day")
      .max(100000, "€1000/day max"),
    // Optional: empty string (not set) is valid, but a non-empty value must
    // be a real price. Never required — long stays are the exception, not
    // the norm, and this never feeds settlement math (see schema comment).
    pricePerMonthCents: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 100 && v <= 2000000), {
        message: "Enter a valid monthly price",
      }),
    smoker: z.string().trim().min(1),
    pets: z.string().trim().min(1),
    // Relative paths (local disk storage, e.g. "/uploads/xyz.png") as well as
    // absolute URLs (Vercel Blob in prod) are valid, so just require non-empty.
    // Onboarding's photo steps are skippable (see OnboardingWizard.tsx) —
    // MIN_SELF_PHOTO_COUNT/MIN_FLAT_PHOTO_COUNT are shown there as guidance
    // (backed by ProfileCompletionBanner's ongoing reminder), not enforced
    // here, so a profile can be created or edited with zero photos.
    selfPhotoUrls: z.array(z.string().min(1)).max(MAX_SELF_PHOTO_COUNT),
    flatPhotoUrls: z.array(z.string().min(1)).max(MAX_FLAT_PHOTO_COUNT),
    // Optional: a single Blob URL, uploaded client-side (see
    // /api/upload/video). Empty string means no video.
    flatVideoUrl: z.string().trim().max(2000).optional(),
    // Not required here: the onboarding wizard already gates non-empty entry
    // client-side before letting a new profile advance past that step, but
    // requiring it again on every save would block editing any other field
    // for accounts that predate this field (their value loads as "").
    selfDescription: z.string().trim().max(1000),
    flatDescription: z.string().trim().max(1000),
    prompts: z
      .array(promptSchema)
      .min(MIN_PROMPT_COUNT, `Answer at least ${MIN_PROMPT_COUNT} prompts`)
      .max(MAX_PROMPT_COUNT),
    // Short-term rental registration number (EU 2024/1028) — collected at
    // listing creation because any listing could end up as a one-directional
    // stay. Not required here, same reasoning as selfDescription/
    // flatDescription above: requiring it on every save would block editing
    // any other field for accounts that predate this field. The onboarding
    // wizard enforces "a number, or exempt" client-side for new profiles
    // (see OnboardingWizard.tsx) since that's the actual "listing creation"
    // moment the brief means.
    shortTermRentalRegistrationNumber: z.string().trim().max(100),
    shortTermRentalRegistrationExempt: z.boolean(),
  })
  .refine((data) => data.availableTo > data.availableFrom, {
    message: "Available to must be after available from",
    path: ["availableTo"],
  })
  .refine((data) => new Set(data.prompts.map((p) => p.question)).size === data.prompts.length, {
    message: "Each prompt must be unique",
    path: ["prompts"],
  });

// POST: create/update the current user's profile (onboarding wizard + profile edits submit here)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid profile data" },
      { status: 400 }
    );
  }

  const {
    name,
    age,
    university,
    program,
    yearOfStudy,
    homeCity,
    address,
    availableFrom,
    availableTo,
    accommodates,
    pricePerDayCents,
    pricePerMonthCents,
    smoker,
    pets,
    selfPhotoUrls,
    flatPhotoUrls,
    flatVideoUrl,
    selfDescription,
    flatDescription,
    prompts,
    shortTermRentalRegistrationNumber,
    shortTermRentalRegistrationExempt,
  } = parsed.data;

  const data = {
    name,
    age,
    university,
    program,
    yearOfStudy,
    homeCity,
    address,
    availableFrom,
    availableTo,
    accommodates: accommodatesLabelToInt(accommodates),
    pricePerDayCents,
    pricePerMonthCents,
    smoker,
    pets,
    selfPhotoUrls: JSON.stringify(selfPhotoUrls),
    flatPhotoUrls: JSON.stringify(flatPhotoUrls),
    flatVideoUrl: flatVideoUrl || null,
    selfDescription,
    flatDescription,
    prompts: JSON.stringify(prompts),
    shortTermRentalRegistrationNumber: shortTermRentalRegistrationNumber || null,
    shortTermRentalRegistrationExempt,
  };

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true });
}

// GET: fetch candidate profiles for the swipe stack, excluding self and
// already-swiped users, optionally narrowed by filters:
//   city              : exact match against homeCity (both sides are drawn
//                       from the same canonical EUROPEAN_CITIES list, so an
//                       exact match is correct and avoids "Lisboa" vs
//                       "Lisbon" vs "Lisbonne" silently missing each other)
//   tripFrom/tripTo   : the viewer's desired travel window
//   minOverlapDays    : how many days the candidate's availability must
//                       overlap with tripFrom/tripTo to count as a match
//   minAccommodates   : candidate's flat must fit at least this many people
// Results are ranked best-match-first: longest date overlap with
// tripFrom/tripTo wins, newest profile breaks ties.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim() || null;
  const tripFromParam = searchParams.get("tripFrom");
  const tripToParam = searchParams.get("tripTo");
  const minOverlapDays = Number(searchParams.get("minOverlapDays")) || 0;
  const minAccommodates = Number(searchParams.get("minAccommodates")) || 0;

  const tripFrom = tripFromParam ? new Date(tripFromParam) : null;
  const tripTo = tripToParam ? new Date(tripToParam) : null;
  const hasValidTripRange =
    tripFrom && tripTo && !Number.isNaN(tripFrom.getTime()) && !Number.isNaN(tripTo.getTime());

  const alreadySwiped = await prisma.swipe.findMany({
    where: { swiperId: userId },
    select: { targetId: true },
  });

  const profiles = await prisma.profile.findMany({
    where: {
      userId: { notIn: [userId, ...alreadySwiped.map((s) => s.targetId)] },
    },
    orderBy: { createdAt: "desc" },
    // A low cap here means older profiles silently become unreachable once
    // enough newer ones exist (bit us with the seed data). At this app's
    // scale a generous cap is safer than a tight one; revisit with real
    // pagination if the candidate pool grows much larger.
    take: 100,
  });

  // Computed once per candidate so both the filter and the ranking below use
  // the same number: negative when the ranges don't overlap at all, so it
  // still separates "close to your dates" from "nowhere near your dates"
  // among candidates that pass the filter untouched (minOverlapDays === 0).
  const withOverlap = profiles.map((p) => {
    let overlapDays = -Infinity;
    if (hasValidTripRange) {
      const overlapStartMs = Math.max(p.availableFrom.getTime(), tripFrom!.getTime());
      const overlapEndMs = Math.min(p.availableTo.getTime(), tripTo!.getTime());
      overlapDays = (overlapEndMs - overlapStartMs) / (1000 * 60 * 60 * 24);
    }
    return { profile: p, overlapDays };
  });

  const filtered = withOverlap.filter(({ profile: p, overlapDays }) => {
    if (city && p.homeCity !== city) return false;
    if (minAccommodates && p.accommodates < minAccommodates) return false;

    // Only exclude on date mismatch if the viewer explicitly asked for a
    // minimum overlap (see FilterPanel.tsx) — dates not lining up shouldn't
    // by itself hide a candidate, since swap dates are negotiated in chat
    // after matching, not locked in before it (see /api/matches/[id]/propose).
    if (hasValidTripRange && minOverlapDays > 0 && overlapDays < minOverlapDays) return false;

    return true;
  });

  // Best matches first: longest date overlap with the viewer's trip window,
  // then newest profile as a tiebreak (and as the fallback ordering when
  // there's no trip range to compare against).
  filtered.sort(
    (a, b) => b.overlapDays - a.overlapDays || b.profile.createdAt.getTime() - a.profile.createdAt.getTime()
  );

  const results: ProfileCardData[] = filtered.map(({ profile: p }) => toProfileCardData(p.userId, p));

  return NextResponse.json({ profiles: results });
}
