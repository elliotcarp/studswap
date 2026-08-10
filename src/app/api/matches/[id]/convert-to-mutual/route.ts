import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// POST: switch a PAID match to a MUTUAL one. Both sides already swiped RIGHT
// on each other by this point (that's how a PAID match got created, see
// /api/likes/[userId]/redeem), so this is just re-declaring intent as "swap
// flats" instead of "pay for one flat", no new like/swipe needed. Only
// allowed before the match is validated, since that's when terms lock in.
// Only the flat owner (who received and accepted the like) can do this, not
// the payer: the payer already declared they're fine paying one-directionally
// and may not want or be able to offer their own flat for a real swap, so
// this can't be forced on them by the other side.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({ where: { id: params.id } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.type !== "PAID") {
    return NextResponse.json({ error: "This match is already a mutual swap" }, { status: 400 });
  }
  if (match.paidByUserId === userId) {
    return NextResponse.json(
      { error: "Only the flat owner can switch this to a mutual swap" },
      { status: 403 }
    );
  }
  if (match.status === "VALIDATED") {
    return NextResponse.json({ error: "This match is already validated" }, { status: 400 });
  }
  if (match.status === "CANCELLED") {
    return NextResponse.json({ error: "This match has been cancelled" }, { status: 400 });
  }

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      type: "MUTUAL",
      paidByUserId: null,
      // Terms were agreed under different semantics (one-directional payment),
      // so require both sides to re-confirm under the mutual-swap terms.
      confirmedByUserA: false,
      confirmedByUserB: false,
    },
  });

  return NextResponse.json({ type: updated.type });
}
