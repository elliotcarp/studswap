// People who liked you but you haven't responded to yet. You can like back
// for free (normal mutual match) or let them pay your asking price directly
// (settled between the two of you, not through StudSwap) to get your flat
// without a match.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import LikedView from "./LikedView";

export default async function LikedPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/signup");
  }

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <>
      <LikedView myCity={profile.homeCity} />
      <Navbar />
    </>
  );
}
