import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import type { NotificationCounts } from "@/types";

// GET: lightweight counts for the Navbar badges. Matches badge is unseen
// activity on mutual matches only; Liked badge is pending likes plus unseen
// activity on accepted PAID connections, since those live on the Liked page
// now too (see /api/likes) rather than Matches, which is mutual-only.
// "Unseen activity" covers anything that changed the match since the
// current user last opened it -- a new match, newly proposed dates, a
// confirm, a cancellation, or a chat message -- not just chat messages
// (see lastActivityAt/lastActivityByUserId on Match).
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const [myResponses, matches] = await Promise.all([
    prisma.swipe.findMany({ where: { swiperId: userId }, select: { targetId: true } }),
    prisma.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: {
        type: true,
        userAId: true,
        lastReadAtUserA: true,
        lastReadAtUserB: true,
        lastActivityAt: true,
        lastActivityByUserId: true,
      },
    }),
  ]);

  const pendingLikeCount = await prisma.swipe.count({
    where: {
      targetId: userId,
      direction: "RIGHT",
      swiperId: { notIn: [...myResponses.map((s) => s.targetId), userId] },
    },
  });

  function hasUnseenActivity(match: (typeof matches)[number]) {
    const isUserA = match.userAId === userId;
    const myLastReadAt = isUserA ? match.lastReadAtUserA : match.lastReadAtUserB;
    return Boolean(
      match.lastActivityByUserId &&
        match.lastActivityByUserId !== userId &&
        (!myLastReadAt || match.lastActivityAt > myLastReadAt)
    );
  }

  const unreadMatchCount = matches.filter((m) => m.type === "MUTUAL" && hasUnseenActivity(m)).length;
  const unreadConnectionCount = matches.filter((m) => m.type === "PAID" && hasUnseenActivity(m)).length;

  const counts: NotificationCounts = { likedCount: pendingLikeCount + unreadConnectionCount, unreadMatchCount };
  return NextResponse.json(counts);
}
