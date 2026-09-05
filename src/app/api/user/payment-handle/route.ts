import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { PAYMENT_METHODS } from "@/lib/paymentMethods";

const METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]];

// PUT { paymentMethod, paymentHandle, paymentHandleAccountName }: how this
// user should be paid directly. paymentMethod picks which kind of
// destination paymentHandle holds (see PAYMENT_METHODS — the source of
// truth for the set), so the UI asks for the right field instead of one
// generic free-text box. StudSwap never verifies or moves this money —
// it's only ever shown to a matched counterpart once both sides have paid
// to confirm, as a frozen snapshot taken at that moment, see
// /api/matches/[id]/route.ts and the Match model comment. Collected at
// listing creation (onboarding); this route also backs the later
// profile-page edit.
const schema = z.object({
  paymentMethod: z.enum(METHOD_VALUES).or(z.literal("")).optional(),
  paymentHandle: z.string().trim().max(200),
  paymentHandleAccountName: z.string().trim().max(100).optional(),
});

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      paymentHandle: parsed.data.paymentHandle || null,
      ...(parsed.data.paymentMethod !== undefined
        ? { paymentMethod: parsed.data.paymentMethod || null }
        : {}),
      ...(parsed.data.paymentHandleAccountName !== undefined
        ? { paymentHandleAccountName: parsed.data.paymentHandleAccountName || null }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
