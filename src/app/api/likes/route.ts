import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { stayDurationDays, totalStayPriceCents } from "@/lib/pricing";
import { deriveChatPreview } from "@/lib/matchPreview";
import type { LikerSummary, MatchSummary } from "@/types";

// GET: everything liked-related for the current user, powers the "Liked"
// page: pending likes (people who swiped RIGHT on you, unanswered), plus
// already-accepted one-directional connections (PAID matches, either side
// accepted). These are one-directional by definition, never a two-way
// match, so they stay off the Matches page (see /api/matches) and live here
// instead, alongside a link into the same chat.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const [myProfile, myResponses, paidMatches] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.swipe.findMany({ where: { swiperId: userId }, select: { targetId: true } }),
    prisma.match.findMany({
      where: { type: "PAID", OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);
  const respondedIds = myResponses.map((s) => s.targetId);

  const pendingLikes = await prisma.swipe.findMany({
    where: {
      targetId: userId,
      direction: "RIGHT",
      swiperId: { notIn: [...respondedIds, userId] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      swiper: { include: { profile: true } },
    },
  });

  // Price shown here is what THEY'D pay to stay at YOUR flat if you use
  // "Chat" (they liked you, so if you skip matching back, they're the payer
  // and your listed price/availability is what applies, see redeem/route.ts).
  const likers: LikerSummary[] = pendingLikes
    .filter((s) => s.swiper.profile && myProfile)
    .map((s) => ({
      userId: s.swiperId,
      name: s.swiper.profile!.name,
      homeCity: s.swiper.profile!.homeCity,
      photoUrl: (JSON.parse(s.swiper.profile!.selfPhotoUrls) as string[])[0] ?? null,
      pricePerDayCents: myProfile!.pricePerDayCents,
      totalPriceCents: totalStayPriceCents(
        myProfile!.pricePerDayCents,
        myProfile!.availableFrom,
        myProfile!.availableTo,
        myProfile!.pricePerMonthCents
      ),
      stayDurationDays: stayDurationDays(myProfile!.availableFrom, myProfile!.availableTo),
    }));

  const connections: MatchSummary[] = paidMatches.map((match) => {
    const isUserA = match.userAId === userId;
    const other = isUserA ? match.userB : match.userA;
    const otherPhotos: string[] = other.profile?.selfPhotoUrls
      ? (JSON.parse(other.profile.selfPhotoUrls) as string[])
      : [];
    const lastMessage = match.messages[0];
    const myLastReadAt = isUserA ? match.lastReadAtUserA : match.lastReadAtUserB;
    const unread = Boolean(
      match.lastActivityByUserId &&
        match.lastActivityByUserId !== userId &&
        (!myLastReadAt || match.lastActivityAt > myLastReadAt)
    );
    const otherName = other.profile?.name ?? "Unknown";

    return {
      matchId: match.id,
      matchType: "PAID",
      status: match.status as MatchSummary["status"],
      isPayer: match.paidByUserId === userId,
      otherUser: {
        id: other.id,
        name: otherName,
        photoUrl: otherPhotos[0] ?? null,
      },
      lastMessage: deriveChatPreview(
        {
          matchType: "PAID",
          status: match.status as "PENDING" | "VALIDATED" | "CANCELLED",
          stayFrom: match.stayFrom,
          stayTo: match.stayTo,
          confirmedByMe: isUserA ? match.confirmedByUserA : match.confirmedByUserB,
          confirmedByOther: isUserA ? match.confirmedByUserB : match.confirmedByUserA,
        },
        otherName,
        lastMessage?.body
      ),
      unread,
      lastActivityAt: match.lastActivityAt.toISOString(),
      createdAt: match.createdAt.toISOString(),
    };
  });
  connections.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));

  return NextResponse.json({ likers, connections });
}
