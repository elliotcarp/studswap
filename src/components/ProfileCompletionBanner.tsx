"use client";

// Hinge-style nudge: onboarding only collects essential setup (see
// OnboardingWizard.tsx) — photos, prompts, and payment are deferred here,
// shown on the profile page until they're actually filled in. Dismissible
// per visit (state lives only in this component, nothing persisted), so it
// comes back on the next page load rather than being gone for good the
// first time someone taps the ×.
//
// Photos are called out first since they gate discovery visibility itself
// (see /api/profile GET) — a profile missing them isn't shown to anyone yet,
// not just "less complete."

import { useState } from "react";
import Link from "next/link";
import { MIN_SELF_PHOTO_COUNT, MIN_FLAT_PHOTO_COUNT } from "@/lib/onboardingOptions";
import { MIN_PROMPT_COUNT } from "@/lib/prompts";

export default function ProfileCompletionBanner({
  selfPhotoCount,
  flatPhotoCount,
  promptCount,
  hasPaymentMethod,
}: {
  selfPhotoCount: number;
  flatPhotoCount: number;
  promptCount: number;
  hasPaymentMethod: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const missingSelf = Math.max(0, MIN_SELF_PHOTO_COUNT - selfPhotoCount);
  const missingFlat = Math.max(0, MIN_FLAT_PHOTO_COUNT - flatPhotoCount);
  const missingPrompts = Math.max(0, MIN_PROMPT_COUNT - promptCount);

  if (dismissed) return null;

  // Photos first: without them the listing isn't shown to anyone yet, not
  // just "less complete" — a materially bigger deal than the other two.
  if (missingSelf > 0 || missingFlat > 0) {
    const parts: string[] = [];
    if (missingSelf > 0) parts.push(`${missingSelf} more photo${missingSelf === 1 ? "" : "s"} of you`);
    if (missingFlat > 0) parts.push(`${missingFlat} more of your flat`);
    return (
      <Banner icon="📸" onDismiss={() => setDismissed(true)}>
        <strong>Add {parts.join(" and ")}.</strong> Your listing won&apos;t show to anyone until you do —
        profiles with no photos aren&apos;t real listings yet.
      </Banner>
    );
  }

  if (missingPrompts > 0) {
    return (
      <Banner icon="💬" onDismiss={() => setDismissed(true)}>
        <strong>Answer {missingPrompts} more profile prompt{missingPrompts === 1 ? "" : "s"}.</strong> A
        little personality goes a long way in a swap decision.
      </Banner>
    );
  }

  if (!hasPaymentMethod) {
    return (
      <Banner icon="💸" onDismiss={() => setDismissed(true)}>
        <strong>Add how you'd like to get paid.</strong> You'll need this set before you can confirm a
        swap where you're owed money — StudSwap never touches it.
      </Banner>
    );
  }

  return null;
}

function Banner({
  icon,
  onDismiss,
  children,
}: {
  icon: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-bloom/15 to-riviera/15 px-4 py-3 text-sm text-riviera-strong">
      <Link href="/profile" className="flex flex-1 items-center gap-3 transition-transform active:scale-[0.99]">
        <span className="text-lg" aria-hidden>
          {icon}
        </span>
        <span className="flex-1">{children}</span>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 px-1 text-riviera-strong/60 hover:text-riviera-strong"
      >
        ×
      </button>
    </div>
  );
}
