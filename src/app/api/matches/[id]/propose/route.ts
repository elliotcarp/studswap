import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const proposeSchema = z
  .object({
    stayFrom: z.coerce.date(),
    stayTo: z.coerce.date(),
    // PAID only: negotiated price/day for the owner's flat, leave unset to
    // keep using their listed price.
    pricePerDayCents: z.coerce.number().int().min(100).max(100000).nullable().optional(),
    // MUTUAL only: negotiated price/day for each side's OWN flat, from the
    // proposer's perspective — leave unset to keep using that side's listed
    // price (see matchValidation.ts for how these are applied).
    myPricePerDayCents: z.coerce.number().int().min(100).max(100000).nullable().optional(),
    otherPricePerDayCents: z.coerce.number().int().min(100).max(100000).nullable().optional(),
  })
  .refine((data) => data.stayTo > data.stayFrom, {
    message: "Stay end must be after stay start",
    path: ["stayTo"],
  });

// POST { stayFrom, stayTo, pricePerDayCents? } (PAID) or
// { stayFrom, stayTo, myPricePerDayCents?, otherPricePerDayCents? } (MUTUAL):
// propose (or re-propose) the dates and optionally negotiate a price/day —
// on a mutual swap, each side's own flat is negotiated independently, so
// there's still a real fairness gap to compute afterward, not one shared
// rate that always zeroes it out. Unlike the old Credits flow, this never
// touches confirmedByUserA/B — "confirmed" now strictly means "paid the €25
// confirmation charge" (see /api/matches/[id]/confirm and
// /api/stripe/webhook), so proposing terms and paying to confirm them are
// two separate, explicit steps for each side. Once either side has already
// paid, dates are locked — changing them would mean paying for terms nobody
// actually confirmed, so this route refuses; cancel and start over instead.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: { userA: { include: { profile: true } }, userB: { include: { profile: true } } },
  });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status === "VALIDATED") {
    return NextResponse.json({ error: "This match is already validated" }, { status: 400 });
  }
  if (match.status === "CANCELLED") {
    return NextResponse.json({ error: "This match has been cancelled" }, { status: 400 });
  }
  if (match.confirmedByUserA || match.confirmedByUserB) {
    return NextResponse.json(
      { error: "Someone has already paid to confirm these terms. Cancel the match to change dates." },
      { status: 400 }
    );
  }

  const parsed = proposeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid dates" },
      { status: 400 }
    );
  }
  const { stayFrom, stayTo, pricePerDayCents, myPricePerDayCents, otherPricePerDayCents } = parsed.data;

  // Dates must fall within whichever availability window actually matters:
  // just the flat owner's for a PAID match, both sides' overlap for MUTUAL.
  let windowFrom: Date;
  let windowTo: Date;
  if (match.type === "PAID") {
    const ownerId = match.paidByUserId === match.userAId ? match.userBId : match.userAId;
    const owner = ownerId === match.userAId ? match.userA : match.userB;
    if (!owner.profile) return NextResponse.json({ error: "Owner profile not found" }, { status: 400 });
    windowFrom = owner.profile.availableFrom;
    windowTo = owner.profile.availableTo;
  } else {
    if (!match.userA.profile || !match.userB.profile) {
      return NextResponse.json({ error: "Both profiles are required" }, { status: 400 });
    }
    windowFrom =
      match.userA.profile.availableFrom > match.userB.profile.availableFrom
        ? match.userA.profile.availableFrom
        : match.userB.profile.availableFrom;
    windowTo =
      match.userA.profile.availableTo < match.userB.profile.availableTo
        ? match.userA.profile.availableTo
        : match.userB.profile.availableTo;
  }

  if (stayFrom < windowFrom || stayTo > windowTo) {
    return NextResponse.json(
      { error: "Those dates fall outside the available window for this match" },
      { status: 400 }
    );
  }

  const isUserA = match.userAId === userId;
  // undefined leaves the existing negotiated price untouched; null
  // explicitly clears it (falls back to listed price).
  const priceData =
    match.type === "PAID"
      ? pricePerDayCents !== undefined
        ? { negotiatedPricePerDayCentsPaid: pricePerDayCents }
        : {}
      : {
          ...(myPricePerDayCents !== undefined
            ? isUserA
              ? { negotiatedPricePerDayCentsUserA: myPricePerDayCents }
              : { negotiatedPricePerDayCentsUserB: myPricePerDayCents }
            : {}),
          ...(otherPricePerDayCents !== undefined
            ? isUserA
              ? { negotiatedPricePerDayCentsUserB: otherPricePerDayCents }
              : { negotiatedPricePerDayCentsUserA: otherPricePerDayCents }
            : {}),
        };

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      stayFrom,
      stayTo,
      ...priceData,
      lastActivityAt: new Date(),
      lastActivityByUserId: userId,
    },
  });

  return NextResponse.json({
    stayFrom: updated.stayFrom?.toISOString() ?? null,
    stayTo: updated.stayTo?.toISOString() ?? null,
    negotiatedPricePerDayCentsPaid: updated.negotiatedPricePerDayCentsPaid,
    myNegotiatedPricePerDayCents: isUserA
      ? updated.negotiatedPricePerDayCentsUserA
      : updated.negotiatedPricePerDayCentsUserB,
    otherNegotiatedPricePerDayCents: isUserA
      ? updated.negotiatedPricePerDayCentsUserB
      : updated.negotiatedPricePerDayCentsUserA,
    confirmedByMe: isUserA ? updated.confirmedByUserA : updated.confirmedByUserB,
    confirmedByOther: isUserA ? updated.confirmedByUserB : updated.confirmedByUserA,
  });
}
