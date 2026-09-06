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

  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: { select: { paymentMethod: true, paymentHandle: true } } },
  });
  if (!profile) {
    redirect("/onboarding");
  }

  const prompts = JSON.parse(profile.prompts) as { question: string; answer: string }[];

  return (
    <>
      <SwipeView
        defaultTripFrom={profile.availableFrom.toISOString().slice(0, 10)}
        defaultTripTo={profile.availableTo.toISOString().slice(0, 10)}
        myCity={profile.homeCity}
        selfPhotoCount={(JSON.parse(profile.selfPhotoUrls) as string[]).length}
        flatPhotoCount={(JSON.parse(profile.flatPhotoUrls) as string[]).length}
        promptCount={prompts.filter((p) => p.question && p.answer.trim().length > 0).length}
        hasPaymentMethod={Boolean(profile.user.paymentMethod && profile.user.paymentHandle)}
      />
      <Navbar />
    </>
  );
}
