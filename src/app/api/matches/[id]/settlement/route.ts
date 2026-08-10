import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const schema = z.object({ action: z.enum(["mark_paid", "confirm_received"]) });

// POST { action }: self-reported settlement status for the off-platform
// amount shown on a validated match (see Match.settlementAmountCents).
// StudSwap has no way to verify this actually happened — these are just two
// independent flags shown to both sides, never reconciled or enforced.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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

  const receiverId = match.settlementPayerId === match.userAId ? match.userBId : match.userAId;

  if (parsed.data.action === "mark_paid") {
    if (userId !== match.settlementPayerId) {
      return NextResponse.json({ error: "Only the payer can mark this paid" }, { status: 403 });
    }
    await prisma.match.update({ where: { id: match.id }, data: { settlementMarkedPaidByPayer: true } });
  } else {
    if (userId !== receiverId) {
      return NextResponse.json({ error: "Only the recipient can confirm this was received" }, { status: 403 });
    }
    await prisma.match.update({ where: { id: match.id }, data: { settlementConfirmedReceivedByPayee: true } });
  }

  return NextResponse.json({ ok: true });
}
