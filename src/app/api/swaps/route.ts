import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import type { SwapSummary } from "@/types";
import { processSwapLifecycleIfNeeded } from "@/lib/swapLifecycle";
import { CANCELLATION_POLICY } from "@/lib/cancellationPolicy";

const RATING_WINDOW_MS = CANCELLATION_POLICY.ratingWindowDays * 24 * 60 * 60 * 1000;

// GET: validated (confirmed) matches for the current user, for the "Your
// swaps" page: partner profile, place, the settlement amount to sort out
// directly with them, and a link back into the existing chat at
// /matches/[id] to keep discussing.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    where: {
      status: "VALIDATED",
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      userA: { include: { profile: true } },
      userB: { include: { profile: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Lazy lifecycle reconciliation (refund at day 1 of the stay,
  // completedSwapCount/rating window at stayTo) — pre-filtered so
  // already-fully-processed swaps don't pay a transaction/Stripe-call cost
  // on every load of this page.
  const now = new Date();
  const needsProcessing = matches.filter((match) => {
    const refundDue =
      match.stayFrom != null &&
      now.getTime() - match.stayFrom.getTime() >= 24 * 60 * 60 * 1000 &&
      (match.refundableStatusUserA === "PENDING" || match.refundableStatusUserB === "PENDING");
    const completionDue = match.completedProcessedAt == null && match.stayTo != null && match.stayTo < now;
    return refundDue || completionDue;
  });
  await Promise.all(needsProcessing.map((match) => processSwapLifecycleIfNeeded(match)));

  const myRatings = await prisma.rating.findMany({
    where: { raterId: userId, matchId: { in: matches.map((m) => m.id) } },
    select: { matchId: true },
  });
  const ratedMatchIds = new Set(myRatings.map((r) => r.matchId));

  const swaps: SwapSummary[] = matches
    .filter((match) => match.stayFrom && match.stayTo)
    .map((match) => {
      const isUserA = match.userAId === userId;
      const other = isUserA ? match.userB : match.userA;
      const otherProfile = other.profile;
      const otherPhotos: string[] = otherProfile?.selfPhotoUrls
        ? (JSON.parse(otherProfile.selfPhotoUrls) as string[])
        : [];
      const lastMessage = match.messages[0];
      const myLastReadAt = isUserA ? match.lastReadAtUserA : match.lastReadAtUserB;
      const unread = Boolean(
        match.lastActivityByUserId &&
          match.lastActivityByUserId !== userId &&
          (!myLastReadAt || match.lastActivityAt > myLastReadAt)
      );

      const direction: SwapSummary["settlement"]["direction"] =
        match.settlementAmountCents <= 0 || !match.settlementPayerId
          ? "none"
          : match.settlementPayerId === userId
            ? "paid"
            : "received";

      // completedProcessedAt/ratingWindowClosesAt on `match` may be stale
      // for rows we just processed above (we didn't re-fetch) — but
      // ratingWindowClosesAt is deterministic from stayTo, so it's
      // recomputed here instead of trusting the possibly-stale column.
      const isCompleted = match.completedProcessedAt != null || match.stayTo! < now;
      const windowClosesAt = new Date(match.stayTo!.getTime() + RATING_WINDOW_MS);
      const canRate = isCompleted && now <= windowClosesAt && !ratedMatchIds.has(match.id);

      return {
        matchId: match.id,
        matchType: match.type === "PAID" ? "PAID" : "MUTUAL",
        otherUser: {
          id: other.id,
          name: otherProfile?.name ?? "Unknown",
          university: otherProfile?.university ?? "",
          photoUrl: otherPhotos[0] ?? null,
        },
        city: otherProfile?.homeCity ?? "",
        address: otherProfile?.address ?? "",
        stayFrom: match.stayFrom!.toISOString(),
        stayTo: match.stayTo!.toISOString(),
        settlement: {
          amountCents: match.settlementAmountCents,
          direction,
          markedPaidByPayer: match.settlementMarkedPaidByPayer,
          confirmedReceivedByPayee: match.settlementConfirmedReceivedByPayee,
        },
        // Frozen at validation time — see Match.paymentHandleSnapshotUserA/B
        // comment — never the live User row, so an edit afterward can't
        // change what's shown for an already-confirmed swap.
        otherPaymentMethod: (isUserA ? match.paymentMethodSnapshotUserB : match.paymentMethodSnapshotUserA) ?? null,
        otherPaymentHandle: (isUserA ? match.paymentHandleSnapshotUserB : match.paymentHandleSnapshotUserA) ?? null,
        myRefundableStatus: (isUserA ? match.refundableStatusUserA : match.refundableStatusUserB) as
          | "PENDING"
          | "REFUNDED"
          | "FORFEITED",
        isComplete: isCompleted,
        lastMessage: lastMessage?.body,
        unread,
        createdAt: match.createdAt.toISOString(),
        canRate,
      };
    });

  return NextResponse.json({ swaps });
}
