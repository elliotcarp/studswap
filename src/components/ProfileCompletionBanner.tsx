"use client";

// Hinge-style nudge: onboarding's photo steps are skippable (see
// OnboardingWizard.tsx), so this is the reminder that follows up afterwards,
// shown wherever someone spends time in the app (the swipe deck, their own
// profile) until they actually add the missing photos. Dismissible per
// visit (state lives only in this component, nothing persisted), so it
// comes back on the next page load rather than being gone for good the
// first time someone taps the ×.

import { useState } from "react";
import Link from "next/link";
import { MIN_SELF_PHOTO_COUNT, MIN_FLAT_PHOTO_COUNT } from "@/lib/onboardingOptions";

export default function ProfileCompletionBanner({
  selfPhotoCount,
  flatPhotoCount,
}: {
  selfPhotoCount: number;
  flatPhotoCount: number;
}) {
  const [dismissed, setDismissed] = useState(false);
  const missingSelf = Math.max(0, MIN_SELF_PHOTO_COUNT - selfPhotoCount);
  const missingFlat = Math.max(0, MIN_FLAT_PHOTO_COUNT - flatPhotoCount);
  if (dismissed || (missingSelf === 0 && missingFlat === 0)) return null;

  const parts: string[] = [];
  if (missingSelf > 0) parts.push(`${missingSelf} more photo${missingSelf === 1 ? "" : "s"} of you`);
  if (missingFlat > 0) parts.push(`${missingFlat} more of your flat`);

  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-bloom/15 to-riviera/15 px-4 py-3 text-sm text-riviera-strong">
      <Link href="/profile" className="flex flex-1 items-center gap-3 transition-transform active:scale-[0.99]">
        <span className="text-lg" aria-hidden>
          📸
        </span>
        <span className="flex-1">
          <strong>Add {parts.join(" and ")}.</strong> Complete photo sets typically get far more likes and
          matches, a pattern seen across swipe apps generally: think up to 40% more.
        </span>
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0 px-1 text-riviera-strong/60 hover:text-riviera-strong"
      >
        ×
      </button>
    </div>
  );
}
