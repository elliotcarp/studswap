import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { totalStayPriceCents } from "@/lib/pricing";
import { CANCELLATION_POLICY, computeCancellationOutcome } from "@/lib/cancellationPolicy";
import { processSwapLifecycleIfNeeded } from "@/lib/swapLifecycle";
import { settlementReminderStage } from "@/lib/settlementReminders";

// GET: trip-details panel data for a match, current agreed stay dates (if
// any), each side's confirmation/payment status, and a settlement preview.
// Powers the "agree on dates -> pay to confirm -> validated" flow shown
// above the chat. Settlement is informational only — StudSwap calculates
// and displays it, but never charges, holds, or transfers it.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      userA: { include: { profile: true } },
      userB: { include: { profile: true } },
    },
  });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const now = new Date();
  const refundDue =
    match.stayFrom != null &&
    now.getTime() - match.stayFrom.getTime() >= 24 * 60 * 60 * 1000 &&
    (match.refundableStatusUserA === "PENDING" || match.refundableStatusUserB === "PENDING");
  const completionDue = match.completedProcessedAt == null && match.stayTo != null && match.stayTo < now;
  if (match.status === "VALIDATED" && (refundDue || completionDue)) {
    await processSwapLifecycleIfNeeded(match);
    match = await prisma.match.findUnique({
      where: { id: params.id },
      include: { userA: { include: { profile: true } }, userB: { include: { profile: true } } },
    });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const isUserA = match.userAId === userId;
  const me = isUserA ? match.userA : match.userB;
  const other = isUserA ? match.userB : match.userA;
  const confirmedByMe = isUserA ? match.confirmedByUserA : match.confirmedByUserB;
  const confirmedByOther = isUserA ? match.confirmedByUserB : match.confirmedByUserA;
  const myRefundableStatus = isUserA ? match.refundableStatusUserA : match.refundableStatusUserB;
  const otherRefundableStatus = isUserA ? match.refundableStatusUserB : match.refundableStatusUserA;

  // The allowed window to propose dates within: for PAID, only the flat
  // owner's availability matters; for MUTUAL, both sides' windows must overlap.
  let windowFrom: Date;
  let windowTo: Date;
  if (match.type === "PAID") {
    const ownerId = match.paidByUserId === match.userAId ? match.userBId : match.userAId;
    const owner = ownerId === match.userAId ? match.userA : match.userB;
    windowFrom = owner.profile?.availableFrom ?? new Date();
    windowTo = owner.profile?.availableTo ?? new Date();
  } else {
    const meFrom = me.profile?.availableFrom ?? new Date();
    const otherFrom = other.profile?.availableFrom ?? new Date();
    const meTo = me.profile?.availableTo ?? new Date();
    const otherTo = other.profile?.availableTo ?? new Date();
    windowFrom = meFrom > otherFrom ? meFrom : otherFrom;
    windowTo = meTo < otherTo ? meTo : otherTo;
  }

  // Raw per-day rates plus any current negotiated override (independent of
  // whether stay dates are agreed yet), so the client can compute a live
  // settlement preview and prefill the negotiate form while the user is
  // still typing draft dates/price. PAID: only the owner's rate matters.
  // MUTUAL: each side's own rate is negotiable independently, so both sides
  // keep a real (still adjustable) fairness gap instead of one shared rate
  // that would always zero it out.
  const myNegotiatedPricePerDayCents = isUserA
    ? match.negotiatedPricePerDayCentsUserA
    : match.negotiatedPricePerDayCentsUserB;
  const otherNegotiatedPricePerDayCents = isUserA
    ? match.negotiatedPricePerDayCentsUserB
    : match.negotiatedPricePerDayCentsUserA;
  let pricing:
    | {
        kind: "PAID";
        ownerPricePerDayCents: number | null;
        ownerPricePerMonthCents: number | null;
        negotiatedPricePerDayCents: number | null;
      }
    | {
        kind: "MUTUAL";
        myPricePerDayCents: number | null;
        myPricePerMonthCents: number | null;
        otherPricePerDayCents: number | null;
        otherPricePerMonthCents: number | null;
        myNegotiatedPricePerDayCents: number | null;
        otherNegotiatedPricePerDayCents: number | null;
      };
  if (match.type === "PAID") {
    const ownerId = match.paidByUserId === match.userAId ? match.userBId : match.userAId;
    const owner = ownerId === match.userAId ? match.userA : match.userB;
    pricing = {
      kind: "PAID",
      ownerPricePerDayCents: owner.profile?.pricePerDayCents ?? null,
      ownerPricePerMonthCents: owner.profile?.pricePerMonthCents ?? null,
      negotiatedPricePerDayCents: match.negotiatedPricePerDayCentsPaid,
    };
  } else {
    pricing = {
      kind: "MUTUAL",
      myPricePerDayCents: me.profile?.pricePerDayCents ?? null,
      myPricePerMonthCents: me.profile?.pricePerMonthCents ?? null,
      otherPricePerDayCents: other.profile?.pricePerDayCents ?? null,
      otherPricePerMonthCents: other.profile?.pricePerMonthCents ?? null,
      myNegotiatedPricePerDayCents,
      otherNegotiatedPricePerDayCents,
    };
  }

  // Settlement preview — the price difference (MUTUAL) or full stay cost
  // (PAID) the two sides should settle directly between themselves. Once
  // VALIDATED, this uses the frozen snapshot (settlementAmountCents/
  // settlementPayerId) rather than recomputing from current prices, so it
  // stays a stable historical record even if a listed price changes later.
  let settlement: { amountCents: number; payerId: string | null } | null = null;
  if (match.status === "VALIDATED") {
    settlement = { amountCents: match.settlementAmountCents, payerId: match.settlementPayerId };
  } else if (match.stayFrom && match.stayTo) {
    if (match.type === "PAID") {
      const ownerId = match.paidByUserId === match.userAId ? match.userBId : match.userAId;
      const owner = ownerId === match.userAId ? match.userA : match.userB;
      const pricePerDay = match.negotiatedPricePerDayCentsPaid ?? owner.profile?.pricePerDayCents ?? null;
      const pricePerMonth =
        match.negotiatedPricePerDayCentsPaid != null ? null : owner.profile?.pricePerMonthCents ?? null;
      if (pricePerDay != null) {
        settlement = {
          amountCents: totalStayPriceCents(pricePerDay, match.stayFrom, match.stayTo, pricePerMonth),
          payerId: match.paidByUserId,
        };
      }
    } else {
      const myRate = myNegotiatedPricePerDayCents ?? me.profile?.pricePerDayCents ?? null;
      const otherRate = otherNegotiatedPricePerDayCents ?? other.profile?.pricePerDayCents ?? null;
      const myMonthlyRate = myNegotiatedPricePerDayCents != null ? null : me.profile?.pricePerMonthCents ?? null;
      const otherMonthlyRate =
        otherNegotiatedPricePerDayCents != null ? null : other.profile?.pricePerMonthCents ?? null;
      if (myRate != null && otherRate != null) {
        const myTotal = totalStayPriceCents(myRate, match.stayFrom, match.stayTo, myMonthlyRate);
        const otherTotal = totalStayPriceCents(otherRate, match.stayFrom, match.stayTo, otherMonthlyRate);
        const diff = myTotal - otherTotal;
        const compensatedIsMe = diff > 0;
        settlement =
          diff === 0
            ? { amountCents: 0, payerId: null }
            : { amountCents: Math.abs(diff), payerId: compensatedIsMe ? other.id : me.id };
      }
    }
  }

  // Cancellation preview — computed, not persisted, mirroring
  // /api/matches/[id]/cancel/route.ts. Null once the match is cancelled or
  // the stay's already been marked completed — there's nothing left to cancel.
  let cancellationPreview: { outcome: "REFUNDED" | "FORFEITED"; forfeitedCents: number } | null = null;
  if (match.status === "VALIDATED" && match.completedProcessedAt == null && match.stayFrom) {
    // If my €20 has already auto-refunded (a day into the stay, see
    // swapLifecycle.ts), there's nothing left to forfeit even if the notice
    // window would otherwise call this "late" — mirrors cancel/route.ts.
    const outcome = myRefundableStatus === "PENDING" ? computeCancellationOutcome(new Date(), match.stayFrom) : "REFUNDED";
    cancellationPreview = {
      outcome,
      forfeitedCents: outcome === "FORFEITED" ? CANCELLATION_POLICY.refundableCents : 0,
    };
  }

  // What actually happened, for the "this swap was cancelled" card — the
  // full record instead of a bare status flip. One CancellationLog row per
  // cancellation event (see /api/matches/[id]/cancel/route.ts), so the most
  // recent one is the (only) one that matters.
  let cancellation: {
    cancelledByMe: boolean;
    cancelledAt: string;
    daysNotice: number;
    outcome: "REFUNDED" | "FORFEITED" | "OUR_FAULT";
    forfeitedCents: number;
    // Only set when I'm the one owed a forfeited amount — paid out by
    // manual bank transfer, not automatically, see ForfeiturePayout model
    // comment and /api/admin.
    myPayoutStatus: "PENDING" | "PAID" | null;
    myPayoutReference: string | null;
  } | null = null;
  if (match.status === "CANCELLED") {
    const log = await prisma.cancellationLog.findFirst({
      where: { matchId: match.id },
      orderBy: { cancelledAt: "desc" },
    });
    if (log) {
      let myPayoutStatus: "PENDING" | "PAID" | null = null;
      let myPayoutReference: string | null = null;
      if (log.outcome === "FORFEITED" && log.affectedUserId === userId) {
        const payout = await prisma.forfeiturePayout.findFirst({
          where: { matchId: match.id, recipientUserId: userId },
          orderBy: { createdAt: "desc" },
        });
        myPayoutStatus = (payout?.status as "PENDING" | "PAID" | undefined) ?? null;
        myPayoutReference = payout?.paidReference ?? null;
      }
      cancellation = {
        // OUR_FAULT rows' cancelledByUserId isn't attributive — see the
        // void-our-fault route comment — so this is checked first.
        cancelledByMe: log.outcome !== "OUR_FAULT" && log.cancelledByUserId === userId,
        cancelledAt: log.cancelledAt.toISOString(),
        daysNotice: log.daysNotice,
        outcome: log.outcome as "REFUNDED" | "FORFEITED" | "OUR_FAULT",
        forfeitedCents: log.refundableForfeitedCents,
        myPayoutStatus,
        myPayoutReference,
      };
    }
  }

  const settled = match.settlementMarkedPaidByPayer && match.settlementConfirmedReceivedByPayee;
  const reminderStage = settlementReminderStage(now, match.stayFrom, match.settlementAmountCents, Boolean(settled));

  const canReportNoShow =
    match.status === "VALIDATED" &&
    match.stayFrom != null &&
    match.stayFrom <= now &&
    match.noShowReportedByUserId == null;

  return NextResponse.json({
    matchId: match.id,
    type: match.type,
    status: match.status,
    stayFrom: match.stayFrom?.toISOString() ?? null,
    stayTo: match.stayTo?.toISOString() ?? null,
    negotiatedPricePerDayCentsPaid: match.negotiatedPricePerDayCentsPaid,
    myNegotiatedPricePerDayCents,
    otherNegotiatedPricePerDayCents,
    confirmedByMe,
    confirmedByOther,
    otherUserName: other.profile?.name ?? "Unknown",
    // Only revealed once both sides have paid to confirm, and frozen at the
    // instant it validated (see /api/stripe/webhook) — so an edit to the
    // other side's payment details afterward never changes what's shown
    // here for an arrangement already confirmed.
    otherPaymentMethod: match.status === "VALIDATED" ? (isUserA ? match.paymentMethodSnapshotUserB : match.paymentMethodSnapshotUserA) : null,
    otherPaymentHandle: match.status === "VALIDATED" ? (isUserA ? match.paymentHandleSnapshotUserB : match.paymentHandleSnapshotUserA) : null,
    otherPaymentHandleAccountName:
      match.status === "VALIDATED"
        ? isUserA
          ? match.paymentHandleAccountNameSnapshotUserB
          : match.paymentHandleAccountNameSnapshotUserA
        : null,
    isPayer: match.type === "PAID" ? match.paidByUserId === userId : null,
    windowFrom: windowFrom.toISOString(),
    windowTo: windowTo.toISOString(),
    pricing,
    settlement,
    settlementIsMePaying: settlement?.payerId === userId,
    settlementMarkedPaidByPayer: match.settlementMarkedPaidByPayer,
    settlementConfirmedReceivedByPayee: match.settlementConfirmedReceivedByPayee,
    settlementReminderStage: reminderStage,
    settlementDisputeReported: match.settlementDisputeReportedByUserId != null,
    confirmationCharge: {
      totalCents: CANCELLATION_POLICY.serviceFeeCents + CANCELLATION_POLICY.refundableCents,
      serviceFeeCents: CANCELLATION_POLICY.serviceFeeCents,
      refundableCents: CANCELLATION_POLICY.refundableCents,
    },
    myRefundableStatus,
    otherRefundableStatus,
    cancellationPreview,
    cancellation,
    completedProcessedAt: match.completedProcessedAt?.toISOString() ?? null,
    ratingWindowClosesAt: match.ratingWindowClosesAt?.toISOString() ?? null,
    canReportNoShow,
    noShowReported: match.noShowReportedByUserId != null,
    noShowReportedByMe: match.noShowReportedByUserId === userId,
  });
}
