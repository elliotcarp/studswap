// Profile view + per-field edit. First-time setup happens on /onboarding;
// once a profile exists, this is where it's viewed and edited.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accommodatesIntToLabel } from "@/lib/onboardingOptions";
import Navbar from "@/components/Navbar";
import ProfileView from "./ProfileView";
import type { ProfileFormData, RatingSummary } from "@/types";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/signup");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: { select: { paymentMethod: true, paymentHandle: true, paymentHandleAccountName: true } } },
  });
  if (!profile) {
    redirect("/onboarding");
  }

  const initialProfile: ProfileFormData = {
    name: profile.name,
    age: String(profile.age),
    university: profile.university,
    program: profile.program,
    yearOfStudy: profile.yearOfStudy,
    homeCity: profile.homeCity,
    address: profile.address ?? "",
    availableFrom: profile.availableFrom.toISOString().slice(0, 10),
    availableTo: profile.availableTo.toISOString().slice(0, 10),
    accommodates: accommodatesIntToLabel(profile.accommodates),
    pricePerDayCents: String(profile.pricePerDayCents),
    pricePerMonthCents: profile.pricePerMonthCents != null ? String(profile.pricePerMonthCents) : "",
    smoker: profile.smoker,
    pets: profile.pets,
    selfPhotoUrls: JSON.parse(profile.selfPhotoUrls),
    flatPhotoUrls: JSON.parse(profile.flatPhotoUrls),
    flatVideoUrl: profile.flatVideoUrl ?? "",
    selfDescription: profile.selfDescription ?? "",
    flatDescription: profile.flatDescription ?? "",
    prompts: JSON.parse(profile.prompts),
    shortTermRentalRegistrationNumber: profile.shortTermRentalRegistrationNumber ?? "",
    shortTermRentalRegistrationExempt: profile.shortTermRentalRegistrationExempt,
  };

  const ratingSummary: RatingSummary = {
    completedSwapCount: profile.completedSwapCount,
    ratingCount: profile.ratingCount,
    overallAvg: profile.ratingOverallAvg,
    communicationAvg: profile.ratingCommunicationAvg,
    flatMatchedPct: profile.ratingFlatMatchedPct,
    wouldAgainPct: profile.ratingWouldAgainPct,
  };

  return (
    <>
      <ProfileView
        initialProfile={initialProfile}
        initialPaymentMethod={profile.user.paymentMethod ?? ""}
        initialPaymentHandle={profile.user.paymentHandle ?? ""}
        initialPaymentHandleAccountName={profile.user.paymentHandleAccountName ?? ""}
        ratingSummary={ratingSummary}
      />
      <Navbar />
    </>
  );
}
