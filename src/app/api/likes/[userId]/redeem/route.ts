import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

// POST: let someone who already liked you (swiped right on you) pay to stay
// at YOUR flat, without you needing to like them back. Used on the "Liked"
// page: this is the "let them have my flat even if I don't match them back"
// path from a pending like. They're the one who expressed interest, so
// they're the payer and you're the flat owner (see paidByUserId below). This
// creates a PENDING match only — no money moves through StudSwap for the
// stay itself, ever; the payer and owner settle the stay cost directly
// between themselves once both sides agree on dates in chat, see
// /api/matches/[id]/propose. The only money StudSwap charges is the flat
// €25 confirmation fee, see /api/matches/[id]/confirm.
export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  const myId = (session?.user as { id?: string } | undefined)?.id;
  if (!myId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!rateLimit(`redeem:${myId}`, 60, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Slow down a bit and try again shortly." }, { status: 429 });
  }

  const theirId = params.userId;
  if (theirId === myId) {
    return NextResponse.json({ error: "Cannot redeem on yourself" }, { status: 400 });
  }

  const theirLike = await prisma.swipe.findUnique({
    where: { swiperId_targetId: { swiperId: theirId, targetId: myId } },
  });
  if (!theirLike || theirLike.direction !== "RIGHT") {
    return NextResponse.json({ error: "This person hasn't liked you" }, { status: 400 });
  }

  const myResponse = await prisma.swipe.findUnique({
    where: { swiperId_targetId: { swiperId: myId, targetId: theirId } },
  });
  if (myResponse) {
    return NextResponse.json({ error: "You've already responded to this like" }, { status: 400 });
  }

  const myProfile = await prisma.profile.findUnique({ where: { userId: myId } });
  if (!myProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const [userAId, userBId] = [myId, theirId].sort();

  const match = await prisma.$transaction(async (tx) => {
    await tx.swipe.create({ data: { swiperId: myId, targetId: theirId, direction: "RIGHT" } });
    // lastActivityByUserId is the owner (myId) who just accepted -- theirId
    // (the payer who liked first) hasn't seen this yet, so it's new for them.
    return tx.match.create({
      data: { userAId, userBId, type: "PAID", paidByUserId: theirId, lastActivityByUserId: myId },
    });
  });

  return NextResponse.json({ matched: true, matchId: match.id });
}
