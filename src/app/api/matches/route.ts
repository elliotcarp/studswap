import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { deriveChatPreview } from "@/lib/matchPreview";
import type { MatchSummary } from "@/types";

// GET: list mutual matches for the current user (for the /matches list page).
// PAID one-directional connections (accepted likes) live on the Liked page
// instead, see /api/likes: this page is only for actual two-way matches.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    where: { type: "MUTUAL", OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: { include: { profile: true } },
      userB: { include: { profile: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const summaries: MatchSummary[] = matches.map((match) => {
    const isUserA = match.userAId === userId;
    const other = isUserA ? match.userB : match.userA;
    const otherPhotos: string[] = other.profile?.selfPhotoUrls
      ? (JSON.parse(other.profile.selfPhotoUrls) as string[])
      : [];
    const lastMessage = match.messages[0];
    const myLastReadAt = isUserA ? match.lastReadAtUserA : match.lastReadAtUserB;
    // Unseen activity covers anything new: a message, but also newly
    // proposed dates, a confirm, or a cancellation, not just chat.
    const unread = Boolean(
      match.lastActivityByUserId &&
        match.lastActivityByUserId !== userId &&
        (!myLastReadAt || match.lastActivityAt > myLastReadAt)
    );
    const otherName = other.profile?.name ?? "Unknown";

    return {
      matchId: match.id,
      matchType: match.type === "PAID" ? "PAID" : "MUTUAL",
      status: match.status as MatchSummary["status"],
      isPayer: match.type === "PAID" ? match.paidByUserId === userId : null,
      otherUser: {
        id: other.id,
        name: otherName,
        photoUrl: otherPhotos[0] ?? null,
      },
      lastMessage: deriveChatPreview(
        {
          matchType: match.type === "PAID" ? "PAID" : "MUTUAL",
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
      // Most recent activity of any kind, not just messages or creation
      // time, so a match that just got a new proposal/confirm/message
      // jumps back to the top instead of staying buried.
      lastActivityAt: match.lastActivityAt.toISOString(),
      createdAt: match.createdAt.toISOString(),
    };
  });

  summaries.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));

  return NextResponse.json({ matches: summaries });
}
