// Simple chat for a single match. Polls GET /api/matches/[id]/messages every few seconds,
// posts new messages via POST /api/matches/[id]/messages.
// v1: plain polling is fine, no websockets needed.

import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toProfileCardData } from "@/lib/profileMapping";
import ChatView from "./ChatView";

export default async function MatchChatPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/signup");
  }

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      userA: { include: { profile: true } },
      userB: { include: { profile: true } },
    },
  });

  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    notFound();
  }

  const isUserA = match.userAId === userId;
  const other = isUserA ? match.userB : match.userA;
  const me = isUserA ? match.userA : match.userB;
  const p = other.profile;
  const matchType = match.type === "PAID" ? "PAID" : "MUTUAL";
  const isPayer = matchType === "PAID" && match.paidByUserId === userId;

  // Mark read: powers the unread badge on the Matches tab.
  await prisma.match.update({
    where: { id: match.id },
    data: isUserA ? { lastReadAtUserA: new Date() } : { lastReadAtUserB: new Date() },
  });

  return (
    <ChatView
      matchId={match.id}
      currentUserId={userId}
      otherUserId={other.id}
      otherUserName={p?.name ?? "Unknown"}
      otherProfile={p ? toProfileCardData(other.id, p, { includeAddress: true }) : null}
      matchType={matchType}
      isPayer={isPayer}
      myPaymentMethod={me.paymentMethod}
      myPaymentHandle={me.paymentHandle}
      myPaymentHandleAccountName={me.paymentHandleAccountName}
    />
  );
}
