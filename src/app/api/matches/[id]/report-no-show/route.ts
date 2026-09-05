import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// POST: report that the other side never gave access / never turned up for
// a validated stay. Available from the agreed start date onward. Recorded
// once per match (first report wins) — resolved into an actual forfeiture +
// compensation outcome lazily by swapLifecycle.ts/noShow.ts, the same lazy
// pattern the rest of the swap lifecycle already uses. StudSwap doesn't
// investigate this; it's a flag for the admin list (see /api/admin) and the
// trigger for the Terms §10.5 no-show outcome.
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
  if (match.status !== "VALIDATED") {
    return NextResponse.json({ error: "This match isn't validated" }, { status: 400 });
  }
  if (!match.stayFrom || new Date() < match.stayFrom) {
    return NextResponse.json({ error: "You can only report this once the stay has started" }, { status: 400 });
  }
  if (match.noShowReportedByUserId) {
    return NextResponse.json({ error: "This has already been reported" }, { status: 400 });
  }

  await prisma.match.update({
    where: { id: match.id },
    data: { noShowReportedByUserId: userId, noShowReportedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
