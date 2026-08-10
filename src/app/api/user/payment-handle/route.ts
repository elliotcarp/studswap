import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// PUT { paymentHandle }: free-text instructions for how someone should pay
// this user directly (e.g. "PayPal: name@example.com", an IBAN, a Venmo
// handle). StudSwap never verifies or moves this money — it's only ever
// shown to a matched counterpart once both sides have paid to confirm, see
// /api/matches/[id]/route.ts.
const schema = z.object({ paymentHandle: z.string().trim().max(200) });

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment handle" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { paymentHandle: parsed.data.paymentHandle || null },
  });

  return NextResponse.json({ ok: true });
}
