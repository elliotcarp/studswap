import type { Profile } from "@prisma/client";
import { accommodatesIntToLabel } from "@/lib/onboardingOptions";
import type { ProfileCardData } from "@/types";

// Shared DB row -> client shape mapping, used everywhere a Profile needs to
// be shown to someone other than its owner (candidates, match chat, liked
// list target, public profile view).
//
// includeAddress defaults to false: the exact address is only meant to be
// seen by the other side of a confirmed match (see matches/[id]/page.tsx),
// never by someone still browsing the swipe stack or a pending like.
export function toProfileCardData(
  userId: string,
  p: Profile,
  { includeAddress = false }: { includeAddress?: boolean } = {}
): ProfileCardData {
  return {
    userId,
    name: p.name,
    age: String(p.age),
    university: p.university,
    program: p.program,
    yearOfStudy: p.yearOfStudy,
    homeCity: p.homeCity,
    address: includeAddress ? (p.address ?? "") : "",
    availableFrom: p.availableFrom.toISOString(),
    availableTo: p.availableTo.toISOString(),
    accommodates: accommodatesIntToLabel(p.accommodates),
    pricePerDayCents: String(p.pricePerDayCents),
    pricePerMonthCents: p.pricePerMonthCents != null ? String(p.pricePerMonthCents) : "",
    smoker: p.smoker,
    pets: p.pets,
    selfPhotoUrls: JSON.parse(p.selfPhotoUrls) as string[],
    flatPhotoUrls: JSON.parse(p.flatPhotoUrls) as string[],
    flatVideoUrl: p.flatVideoUrl ?? "",
    selfDescription: p.selfDescription ?? "",
    flatDescription: p.flatDescription ?? "",
    prompts: JSON.parse(p.prompts) as ProfileCardData["prompts"],
    // Compliance data, not a matching signal — never shown to another user,
    // regardless of match state, so always blanked here (see ProfileFormData).
    shortTermRentalRegistrationNumber: "",
    shortTermRentalRegistrationExempt: false,
    ratingSummary: {
      completedSwapCount: p.completedSwapCount,
      ratingCount: p.ratingCount,
      overallAvg: p.ratingOverallAvg,
      communicationAvg: p.ratingCommunicationAvg,
      flatMatchedPct: p.ratingFlatMatchedPct,
      wouldAgainPct: p.ratingWouldAgainPct,
    },
  };
}
