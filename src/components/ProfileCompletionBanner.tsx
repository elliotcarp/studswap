"use client";

// Presentational only: the caller computes what's missing and hands over
// the single top item to show (see ProfileView.tsx's checklist, or
// SwipeView.tsx's simpler photos/prompts/payment version) — this just
// renders it and offers a dismiss that comes back once that specific item
// is fixed and a new one takes its place (tracked by `item.key`, not just
// "was the banner ever dismissed").
//
// On /profile, `onClick` opens the right section's editor in place instead
// of navigating (see ProfileView.tsx). Anywhere else (e.g. the swipe deck),
// omitting `onClick` falls back to a plain link to /profile.

import { useState } from "react";
import Link from "next/link";

export interface ChecklistItem {
  key: string;
  icon: string;
  message: React.ReactNode;
}

export default function ProfileCompletionBanner({
  item,
  onClick,
}: {
  item: ChecklistItem | null;
  onClick?: () => void;
}) {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  if (!item || item.key === dismissedKey) return null;

  const content = (
    <>
      <span className="text-lg" aria-hidden>
        {item.icon}
      </span>
      <span className="flex-1">{item.message}</span>
    </>
  );

  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-bloom/15 to-riviera/15 px-4 py-3 text-sm text-riviera-strong">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex flex-1 items-center gap-3 text-left transition-transform active:scale-[0.99]"
        >
          {content}
        </button>
      ) : (
        <Link href="/profile" className="flex flex-1 items-center gap-3 transition-transform active:scale-[0.99]">
          {content}
        </Link>
      )}
      <button
        type="button"
        onClick={() => setDismissedKey(item.key)}
        aria-label="Dismiss"
        className="flex-shrink-0 px-1 text-riviera-strong/60 hover:text-riviera-strong"
      >
        ×
      </button>
    </div>
  );
}
