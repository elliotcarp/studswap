// Hinge-style nudge: onboarding's photo steps are skippable (see
// OnboardingWizard.tsx), so this is the "constant reminder" that follows up
// afterwards — shown wherever someone spends time in the app (the swipe
// deck, their own profile) until they actually add the missing photos.
// Deliberately not dismissible: the whole point is that it keeps coming
// back, the way Hinge's own profile-completion prompts do.

import Link from "next/link";
import { MIN_SELF_PHOTO_COUNT, MIN_FLAT_PHOTO_COUNT } from "@/lib/onboardingOptions";

export default function ProfileCompletionBanner({
  selfPhotoCount,
  flatPhotoCount,
}: {
  selfPhotoCount: number;
  flatPhotoCount: number;
}) {
  const missingSelf = Math.max(0, MIN_SELF_PHOTO_COUNT - selfPhotoCount);
  const missingFlat = Math.max(0, MIN_FLAT_PHOTO_COUNT - flatPhotoCount);
  if (missingSelf === 0 && missingFlat === 0) return null;

  const parts: string[] = [];
  if (missingSelf > 0) parts.push(`${missingSelf} more photo${missingSelf === 1 ? "" : "s"} of you`);
  if (missingFlat > 0) parts.push(`${missingFlat} more of your flat`);

  return (
    <Link
      href="/profile"
      className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-bloom/15 to-riviera/15 px-4 py-3 text-sm text-riviera-strong transition-transform active:scale-[0.99]"
    >
      <span className="text-lg" aria-hidden>
        📸
      </span>
      <span className="flex-1">
        <strong>Add {parts.join(" and ")}.</strong> Complete photo sets typically get far more likes and
        matches, a pattern seen across swipe apps generally — think up to 40% more.
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
