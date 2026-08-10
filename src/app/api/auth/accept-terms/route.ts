import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// POST: record that the current user has accepted the Terms of Service and
// Peer Swap Agreement. Gated in front of onboarding, see
// src/app/onboarding/page.tsx and AcceptTermsGate.tsx.
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { acceptedTermsAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
