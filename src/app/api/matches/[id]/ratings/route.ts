import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { processSwapLifecycleIfNeeded } from "@/lib/swapLifecycle";

const ratingSchema = z.object({
  overall: z.number().int().min(1).max(5),
  flatMatchedListing: z.boolean(),
  communication: z.number().int().min(1).max(5),
  wouldSwapAgain: z.boolean(),
});

async function loadMatchForCaller(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) return null;
  return match;
}

// POST: submit a rating for a completed swap. Blind — the other side's
// values aren't revealed until both have submitted or the window closes
// (see GET below). Eligibility: swap lifecycle must already be processed
// (stay ended, see swapLifecycle.ts), the window must still be open, and
// the caller can't have already rated this match (also enforced by the
// @@unique([matchId, raterId]) constraint).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let match = await loadMatchForCaller(params.id, userId);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Defensive lazy trigger: a user could hit this route before ever
  // loading /api/matches/[id] or /api/swaps for this match.
  await processSwapLifecycleIfNeeded(match);
  match = await loadMatchForCaller(params.id, userId);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.completedProcessedAt == null) {
    return NextResponse.json({ error: "This swap hasn't completed yet" }, { status: 400 });
  }
  if (!match.ratingWindowClosesAt || new Date() > match.ratingWindowClosesAt) {
    return NextResponse.json({ error: "The rating window for this swap has closed" }, { status: 400 });
  }

  const parsed = ratingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid rating" },
      { status: 400 }
    );
  }

  const existing = await prisma.rating.findUnique({
    where: { matchId_raterId: { matchId: match.id, raterId: userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "You've already rated this swap" }, { status: 400 });
  }

  const matchId = match.id;
  const rateeId = match.userAId === userId ? match.userBId : match.userAId;

  await prisma.$transaction(async (tx) => {
    await tx.rating.create({
      data: {
        matchId,
        raterId: userId,
        rateeId,
        overall: parsed.data.overall,
        flatMatchedListing: parsed.data.flatMatchedListing,
        communication: parsed.data.communication,
        wouldSwapAgain: parsed.data.wouldSwapAgain,
      },
    });

    // Recomputed fresh from all of the ratee's ratings rather than
    // incremental math — this only runs once per submission, so correctness
    // matters more than shaving a query. _avg only works on the two numeric
    // dimensions; the two boolean dimensions are recomputed as percentages
    // via count().
    const [avg, total, flatMatchedTrue, wouldAgainTrue] = await Promise.all([
      tx.rating.aggregate({ where: { rateeId }, _avg: { overall: true, communication: true } }),
      tx.rating.count({ where: { rateeId } }),
      tx.rating.count({ where: { rateeId, flatMatchedListing: true } }),
      tx.rating.count({ where: { rateeId, wouldSwapAgain: true } }),
    ]);

    await tx.profile.updateMany({
      where: { userId: rateeId },
      data: {
        ratingCount: total,
        ratingOverallAvg: avg._avg.overall,
        ratingCommunicationAvg: avg._avg.communication,
        ratingFlatMatchedPct: total ? (flatMatchedTrue / total) * 100 : null,
        ratingWouldAgainPct: total ? (wouldAgainTrue / total) * 100 : null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}

// GET: this match's rating state for the current user — whether they can
// still rate, their own submitted rating (if any), and the other side's
// rating IF revealed (both submitted, or the window has closed).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const match = await loadMatchForCaller(params.id, userId);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const ratings = await prisma.rating.findMany({ where: { matchId: match.id } });
  const mine = ratings.find((r) => r.raterId === userId) ?? null;
  const theirs = ratings.find((r) => r.raterId !== userId) ?? null;

  const bothSubmitted = ratings.length === 2;
  const windowClosed = Boolean(match.ratingWindowClosesAt && new Date() > match.ratingWindowClosesAt);
  const revealed = bothSubmitted || windowClosed;

  const toPayload = (r: (typeof ratings)[number]) => ({
    overall: r.overall,
    flatMatchedListing: r.flatMatchedListing,
    communication: r.communication,
    wouldSwapAgain: r.wouldSwapAgain,
  });

  return NextResponse.json({
    canRate: match.completedProcessedAt != null && !windowClosed && mine == null,
    myRating: mine ? toPayload(mine) : null,
    theirRating: revealed && theirs ? toPayload(theirs) : null,
    waitingOnOther: mine != null && !revealed,
  });
}
