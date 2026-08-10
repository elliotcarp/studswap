import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  ACCOMMODATES_OPTIONS,
  MAX_SELF_PHOTO_COUNT,
  MIN_SELF_PHOTO_COUNT,
  MAX_FLAT_PHOTO_COUNT,
  MIN_FLAT_PHOTO_COUNT,
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
    smoker: z.string().trim().min(1),
    pets: z.string().trim().min(1),
    // Relative paths (local disk storage, e.g. "/uploads/xyz.png") as well as
    // absolute URLs (Vercel Blob in prod) are valid, so just require non-empty.
    selfPhotoUrls: z
      .array(z.string().min(1))
      .min(MIN_SELF_PHOTO_COUNT, `Add at least ${MIN_SELF_PHOTO_COUNT} photos of you`)
      .max(MAX_SELF_PHOTO_COUNT),
    flatPhotoUrls: z
      .array(z.string().min(1))
      .min(MIN_FLAT_PHOTO_COUNT, `Add at least ${MIN_FLAT_PHOTO_COUNT} photos of the flat`)
      .max(MAX_FLAT_PHOTO_COUNT),
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
    smoker,
    pets,
    selfPhotoUrls,
    flatPhotoUrls,
    selfDescription,
    flatDescription,
    prompts,
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
    smoker,
    pets,
    selfPhotoUrls: JSON.stringify(selfPhotoUrls),
    flatPhotoUrls: JSON.stringify(flatPhotoUrls),
    selfDescription,
    flatDescription,
    prompts: JSON.stringify(prompts),
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

  const filtered = profiles.filter((p) => {
    if (city && p.homeCity !== city) return false;
    if (minAccommodates && p.accommodates < minAccommodates) return false;

    if (hasValidTripRange) {
      const overlapStartMs = Math.max(p.availableFrom.getTime(), tripFrom!.getTime());
      const overlapEndMs = Math.min(p.availableTo.getTime(), tripTo!.getTime());
      const overlapDays = (overlapEndMs - overlapStartMs) / (1000 * 60 * 60 * 24);
      if (overlapDays < minOverlapDays) return false;
    }

    return true;
  });

  const results: ProfileCardData[] = filtered.map((p) => toProfileCardData(p.userId, p));

  return NextResponse.json({ profiles: results });
}
