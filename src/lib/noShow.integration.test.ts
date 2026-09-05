import { describe, it, expect, afterEach } from "vitest";
import type { Match } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveNoShowIfReported } from "./noShow";
import { createUserWithProfile, createValidatedMatch, cleanupMatch, cleanupUser } from "./testHelpers.integration";

// resolveNoShowIfReported requires a non-null stayFrom (matches how
// swapLifecycle.ts only ever calls it after checking that itself) — every
// match created in this suite always has one, so this just satisfies TS.
function withStayFrom(match: Match) {
  return { ...match, stayFrom: match.stayFrom! };
}

describe("resolveNoShowIfReported (real DB)", () => {
  const cleanup: { matchId?: string; userIds: string[] } = { userIds: [] };

  afterEach(async () => {
    if (cleanup.matchId) await cleanupMatch(cleanup.matchId);
    for (const id of cleanup.userIds) await cleanupUser(id);
    cleanup.matchId = undefined;
    cleanup.userIds = [];
  });

  it("does nothing when nobody reported a no-show", async () => {
    const a = await createUserWithProfile();
    const b = await createUserWithProfile();
    cleanup.userIds = [a.id, b.id];
    const stayFrom = new Date("2026-06-01");
    const match = await createValidatedMatch({ userAId: a.id, userBId: b.id, stayFrom, stayTo: new Date("2026-06-08") });
    cleanup.matchId = match.id;

    const resolved = await resolveNoShowIfReported(
      prisma,
      { ...withStayFrom(match), noShowReportedByUserId: null },
      "A",
      new Date()
    );
    expect(resolved).toBe(false);
  });

  it("forfeits the reported-against side's refund and pays the reporter compensation", async () => {
    const a = await createUserWithProfile(); // reporter
    const b = await createUserWithProfile(); // reported against (never gave access)
    cleanup.userIds = [a.id, b.id];
    const stayFrom = new Date("2026-06-01");
    const match = await createValidatedMatch({ userAId: a.id, userBId: b.id, stayFrom, stayTo: new Date("2026-06-08") });
    cleanup.matchId = match.id;

    await prisma.match.update({
      where: { id: match.id },
      data: { noShowReportedByUserId: a.id, noShowReportedAt: new Date() },
    });
    const fresh = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });

    const resolvedForB = await resolveNoShowIfReported(prisma, withStayFrom(fresh), "B", new Date());
    expect(resolvedForB).toBe(true);

    const afterResolve = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(afterResolve.refundableStatusUserB).toBe("FORFEITED");
    // A's own side is untouched by this call — A's normal refund flow (not a
    // no-show) proceeds separately in swapLifecycle.ts.
    expect(afterResolve.refundableStatusUserA).toBe("PENDING");

    const payout = await prisma.forfeiturePayout.findFirst({ where: { matchId: match.id } });
    expect(payout?.recipientUserId).toBe(a.id);
    expect(payout?.amountCents).toBe(2000);
    expect(payout?.status).toBe("PENDING");

    const log = await prisma.cancellationLog.findFirst({ where: { matchId: match.id } });
    expect(log?.outcome).toBe("FORFEITED");
    expect(log?.affectedUserId).toBe(a.id);
  });

  it("is idempotent — resolving the same no-show twice doesn't double-pay", async () => {
    const a = await createUserWithProfile();
    const b = await createUserWithProfile();
    cleanup.userIds = [a.id, b.id];
    const stayFrom = new Date("2026-06-01");
    const match = await createValidatedMatch({ userAId: a.id, userBId: b.id, stayFrom, stayTo: new Date("2026-06-08") });
    cleanup.matchId = match.id;

    await prisma.match.update({
      where: { id: match.id },
      data: { noShowReportedByUserId: a.id, noShowReportedAt: new Date() },
    });

    const fresh1 = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    await resolveNoShowIfReported(prisma, withStayFrom(fresh1), "B", new Date());
    const fresh2 = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    const resolvedAgain = await resolveNoShowIfReported(prisma, withStayFrom(fresh2), "B", new Date());

    expect(resolvedAgain).toBe(false); // already FORFEITED, not PENDING, so this is a no-op
    const payouts = await prisma.forfeiturePayout.findMany({ where: { matchId: match.id } });
    expect(payouts).toHaveLength(1);
  });

  it("never forfeits the reporting side's own refund", async () => {
    const a = await createUserWithProfile();
    const b = await createUserWithProfile();
    cleanup.userIds = [a.id, b.id];
    const stayFrom = new Date("2026-06-01");
    const match = await createValidatedMatch({ userAId: a.id, userBId: b.id, stayFrom, stayTo: new Date("2026-06-08") });
    cleanup.matchId = match.id;

    await prisma.match.update({
      where: { id: match.id },
      data: { noShowReportedByUserId: a.id, noShowReportedAt: new Date() },
    });
    const fresh = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });

    const resolvedForA = await resolveNoShowIfReported(prisma, withStayFrom(fresh), "A", new Date());
    expect(resolvedForA).toBe(false); // A is the reporter, not the reported-against side
  });
});
