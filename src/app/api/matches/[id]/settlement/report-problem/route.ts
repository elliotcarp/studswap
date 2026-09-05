import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const schema = z.object({ note: z.string().trim().max(500).optional() });

// POST { note? }: flag that the off-platform settlement didn't happen as
// expected ("they never paid me" / "I paid and they say they didn't get
// it"). StudSwap doesn't handle this money and doesn't arbitrate — see
// Match.settlementDisputeReportedByUserId comment and the Fees policy — this
// purely gives a real complaint somewhere to land, on the admin list (see
// /api/admin). First report wins; not a back-and-forth thread.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: params.id } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "VALIDATED") {
    return NextResponse.json({ error: "This match isn't validated" }, { status: 400 });
  }
  if (match.settlementAmountCents <= 0 || !match.settlementPayerId) {
    return NextResponse.json({ error: "Nothing to settle on this match" }, { status: 400 });
  }
  if (match.settlementDisputeReportedByUserId) {
    return NextResponse.json({ error: "This has already been reported" }, { status: 400 });
  }

  await prisma.match.update({
    where: { id: match.id },
    data: {
      settlementDisputeReportedByUserId: userId,
      settlementDisputeReportedAt: new Date(),
      settlementDisputeNote: parsed.data.note || null,
    },
  });

  return NextResponse.json({ ok: true });
}
