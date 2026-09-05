import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminEmail } from "@/lib/adminAuth";

const schema = z.object({ reference: z.string().trim().min(1, "Add the bank transfer reference").max(200) });

// POST { reference }: mark a forfeiture payout as sent by manual bank
// transfer, recording the reference an admin used — see ForfeiturePayout
// model comment. This does not move any money itself.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const payout = await prisma.forfeiturePayout.findUnique({ where: { id: params.id } });
  if (!payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }
  if (payout.status === "PAID") {
    return NextResponse.json({ error: "Already marked paid" }, { status: 400 });
  }

  await prisma.forfeiturePayout.update({
    where: { id: payout.id },
    data: { status: "PAID", paidAt: new Date(), paidReference: parsed.data.reference },
  });

  return NextResponse.json({ ok: true });
}
