// Main swipe screen: auth guard, then hands off to the client-side swipe UI.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import SwipeView from "./SwipeView";

export default async function SwipePage() {
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
      <SwipeView
        defaultTripFrom={profile.availableFrom.toISOString().slice(0, 10)}
        defaultTripTo={profile.availableTo.toISOString().slice(0, 10)}
        myCity={profile.homeCity}
      />
      <Navbar />
    </>
  );
}
