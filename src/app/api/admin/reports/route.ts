import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminEmail } from "@/lib/adminAuth";

// GET: open no-show reports and settlement disputes — StudSwap doesn't
// arbitrate either (see Terms §9.2 / the Fees policy), this is purely
// "somewhere a real complaint lands" for an admin to see.
export async function GET() {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const [noShows, disputes] = await Promise.all([
    prisma.match.findMany({
      where: { noShowReportedByUserId: { not: null } },
      orderBy: { noShowReportedAt: "desc" },
      take: 100,
      include: {
        userA: { select: { email: true, profile: { select: { name: true } } } },
        userB: { select: { email: true, profile: { select: { name: true } } } },
      },
    }),
    prisma.match.findMany({
      where: { settlementDisputeReportedByUserId: { not: null } },
      orderBy: { settlementDisputeReportedAt: "desc" },
      take: 100,
      include: {
        userA: { select: { email: true, profile: { select: { name: true } } } },
        userB: { select: { email: true, profile: { select: { name: true } } } },
      },
    }),
  ]);

  const nameOf = (u: { email: string; profile: { name: string } | null }) => u.profile?.name ?? u.email;

  return NextResponse.json({
    noShows: noShows.map((m) => ({
      matchId: m.id,
      stayFrom: m.stayFrom?.toISOString() ?? null,
      reportedByName: m.noShowReportedByUserId === m.userAId ? nameOf(m.userA) : nameOf(m.userB),
      reportedAgainstName: m.noShowReportedByUserId === m.userAId ? nameOf(m.userB) : nameOf(m.userA),
      reportedAt: m.noShowReportedAt?.toISOString() ?? null,
      resolved: m.noShowReportedByUserId === m.userAId
        ? m.refundableStatusUserB === "FORFEITED"
        : m.refundableStatusUserA === "FORFEITED",
    })),
    settlementDisputes: disputes.map((m) => ({
      matchId: m.id,
      amountCents: m.settlementAmountCents,
      reportedByName: m.settlementDisputeReportedByUserId === m.userAId ? nameOf(m.userA) : nameOf(m.userB),
      note: m.settlementDisputeNote,
      reportedAt: m.settlementDisputeReportedAt?.toISOString() ?? null,
    })),
  });
}
