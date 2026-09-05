import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminEmail } from "@/lib/adminAuth";

// GET: forfeiture payouts StudSwap owes (late cancellations + no-shows),
// pending and recently paid, with the recipient's payment destination so an
// admin can actually send the bank transfer — see ForfeiturePayout model
// comment for why this is manual, not automated.
export async function GET() {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const payouts = await prisma.forfeiturePayout.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: 200,
    include: {
      recipient: {
        select: {
          email: true,
          paymentMethod: true,
          paymentHandle: true,
          paymentHandleAccountName: true,
          profile: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    payouts: payouts.map((p) => ({
      id: p.id,
      matchId: p.matchId,
      amountCents: p.amountCents,
      status: p.status,
      note: p.note,
      paidReference: p.paidReference,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
      recipient: {
        name: p.recipient.profile?.name ?? p.recipient.email,
        email: p.recipient.email,
        paymentMethod: p.recipient.paymentMethod,
        paymentHandle: p.recipient.paymentHandle,
        paymentHandleAccountName: p.recipient.paymentHandleAccountName,
      },
    })),
  });
}
