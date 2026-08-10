"use client";

// The "Review & confirm" step: a real housing-platform-style checkpoint
// before you're charged, showing exactly what's about to happen (dates,
// settlement amount, the €25 confirmation charge) and requiring
// acknowledging the Peer Swap Agreement before redirecting to Stripe
// Checkout. The same content (minus the checkbox/buttons) is reachable
// again later via SwapRecapModal, see swapReview.tsx.

import { useState } from "react";
import {
  SettlementCard,
  FeeCard,
  ObligationsCard,
  StayDatesCard,
  type ConfirmationCharge,
  type SettlementPreview,
} from "./swapReview";

export default function ConfirmReviewModal({
  matchId,
  otherUserName,
  isMePaying,
  stayFrom,
  stayTo,
  settlement,
  confirmationCharge,
  onClose,
}: {
  matchId: string;
  otherUserName: string;
  isMePaying: boolean;
  stayFrom: string;
  stayTo: string;
  settlement: SettlementPreview;
  confirmationCharge: ConfirmationCharge;
  onClose: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.checkoutUrl) {
        setError(data?.error ?? "Could not start checkout.");
        setBusy(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Could not start checkout. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="scrollbar-hide max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-bold text-gray-900">This is it. Lock it in.</h2>
        <p className="mt-1 text-sm text-gray-500">
          You're one step from a confirmed swap with {otherUserName}. Here's exactly what happens next.
        </p>

        <StayDatesCard stayFrom={stayFrom} stayTo={stayTo} />
        <SettlementCard preview={settlement} isMePaying={isMePaying} otherUserName={otherUserName} tense="final" />
        <FeeCard charge={confirmationCharge} otherUserName={otherUserName} />

        <ObligationsCard otherUserName={otherUserName}>
          <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 flex-shrink-0"
            />
            <span>I&apos;ve read and agree to the Peer Swap Agreement with {otherUserName}.</span>
          </label>
        </ObligationsCard>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!agreed || busy}
            className="flex-1 rounded-full bg-gradient-to-r from-bloom to-riviera px-4 py-3 text-sm font-medium text-white shadow-lg shadow-bloom/30 disabled:opacity-50"
          >
            {busy ? "Redirecting…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
