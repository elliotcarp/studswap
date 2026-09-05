import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET: the current user's own photo counts, fetched fresh client-side by
// ProfileCompletionBanner's consumers (see SwipeView.tsx) instead of trusting
// a server-rendered prop for the whole session — Next's client-side Router
// Cache can otherwise keep serving the swipe page's stale counts for up to
// its stale-time window after editing photos on /profile and navigating
// back, so this makes the banner self-correct on every mount instead.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { selfPhotoUrls: true, flatPhotoUrls: true },
  });
  if (!profile) {
    return NextResponse.json({ selfPhotoCount: 0, flatPhotoCount: 0 });
  }

  return NextResponse.json({
    selfPhotoCount: (JSON.parse(profile.selfPhotoUrls) as string[]).length,
    flatPhotoCount: (JSON.parse(profile.flatPhotoUrls) as string[]).length,
  });
}
