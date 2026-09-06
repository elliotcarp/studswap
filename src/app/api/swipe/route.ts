import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const swipeSchema = z.object({
  targetId: z.string().min(1),
  direction: z.enum(["LEFT", "RIGHT"]),
});

// POST { targetId, direction: "LEFT" | "RIGHT" }
// Records the swipe. If direction is RIGHT, checks whether the target user
// already swiped RIGHT on the current user -> if so, creates a Match record
// and returns { matched: true, matchId }.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const swiperId = (session?.user as { id?: string } | undefined)?.id;
  if (!swiperId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!rateLimit(`swipe:${swiperId}`, 200, 5 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Slow down a bit and try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = swipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid swipe" },
      { status: 400 }
    );
  }

  const { targetId, direction } = parsed.data;
  if (targetId === swiperId) {
    return NextResponse.json({ error: "Cannot swipe on yourself" }, { status: 400 });
  }

  await prisma.swipe.upsert({
    where: { swiperId_targetId: { swiperId, targetId } },
    create: { swiperId, targetId, direction },
    update: { direction },
  });

  if (direction !== "RIGHT") {
    return NextResponse.json({ matched: false });
  }

  const reciprocal = await prisma.swipe.findUnique({
    where: { swiperId_targetId: { swiperId: targetId, targetId: swiperId } },
  });

  if (!reciprocal || reciprocal.direction !== "RIGHT") {
    return NextResponse.json({ matched: false });
  }

  // Canonical ordering so the same pair always maps to one Match row
  // regardless of who swiped right first.
  const [userAId, userBId] = [swiperId, targetId].sort();

  const existing = await prisma.match.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });

  // No credits move here: the two sides agree on stay dates and confirm
  // in chat first; see /api/matches/[id]/propose and /confirm.
  // lastActivityByUserId is the swiper who completed the match (the other,
  // passive side hasn't seen this yet, so it shows as new for them).
  const match =
    existing ?? (await prisma.match.create({ data: { userAId, userBId, type: "MUTUAL", lastActivityByUserId: swiperId } }));

  return NextResponse.json({ matched: true, matchId: match.id });
}
