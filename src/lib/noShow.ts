// No-show handling: if the person who agreed to provide accommodation never
// gave access or never turned up, the Terms (§10.5) treat that as a
// cancellation by them at the moment access was due — so they lose their
// €20 refundable portion like any other late canceller, and the reporting
// side gets their own €20 back plus €20 compensation, same math as
// cancellationPolicy.ts's FORFEITED outcome, just triggered by a report
// instead of a cancel click.
//
// Reports are recorded any time from stayFrom onward (see
// /api/matches/[id]/report-no-show), but only actually block the automatic
// refund if resolved (via swapLifecycle.ts, which runs lazily whenever a
// page touches this match) before that side's €20 has already gone out. A
// report that arrives after the refund already fired is still recorded and
// visible on the admin page, but the refund itself isn't clawed back — see
// the plan note on this tradeoff.

import type { PrismaClient } from "@prisma/client";
import { CANCELLATION_POLICY } from "./cancellationPolicy";

interface MatchForNoShow {
  id: string;
  userAId: string;
  userBId: string;
  stayFrom: Date;
  noShowReportedByUserId: string | null;
  refundableStatusUserA: string;
  refundableStatusUserB: string;
}

// Called from swapLifecycle.ts right before it would otherwise auto-refund
// a side's €20. Returns true if it resolved a no-show for this side (so the
// caller should skip the normal refund for that side), false otherwise.
export async function resolveNoShowIfReported(
  prisma: PrismaClient,
  match: MatchForNoShow,
  side: "A" | "B",
  now: Date
): Promise<boolean> {
  if (!match.noShowReportedByUserId) return false;

  const reportedAgainstUserId = match.noShowReportedByUserId === match.userAId ? match.userBId : match.userAId;
  const sideUserId = side === "A" ? match.userAId : match.userBId;
  if (sideUserId !== reportedAgainstUserId) return false; // the report isn't against this side

  const sideStatus = side === "A" ? match.refundableStatusUserA : match.refundableStatusUserB;
  if (sideStatus !== "PENDING") return false; // already resolved one way or another

  const reportingUserId = match.noShowReportedByUserId;

  await prisma.$transaction(async (inner) => {
    const fresh = await inner.match.findUnique({
      where: { id: match.id },
      select: { refundableStatusUserA: true, refundableStatusUserB: true },
    });
    const freshStatus = side === "A" ? fresh?.refundableStatusUserA : fresh?.refundableStatusUserB;
    if (freshStatus !== "PENDING") return; // resolved by a concurrent call

    await inner.match.update({
      where: { id: match.id },
      data:
        side === "A"
          ? { refundableStatusUserA: "FORFEITED", refundableResolvedAtUserA: now }
          : { refundableStatusUserB: "FORFEITED", refundableResolvedAtUserB: now },
    });

    await inner.forfeiturePayout.create({
      data: {
        matchId: match.id,
        recipientUserId: reportingUserId,
        amountCents: CANCELLATION_POLICY.refundableCents,
        note: "No-show compensation",
      },
    });

    await inner.cancellationLog.create({
      data: {
        matchId: match.id,
        cancelledByUserId: reportedAgainstUserId,
        affectedUserId: reportingUserId,
        stayFrom: match.stayFrom,
        cancelledAt: now,
        daysNotice: 0,
        outcome: "FORFEITED",
        refundableForfeitedCents: CANCELLATION_POLICY.refundableCents,
      },
    });
  });

  return true;
}
