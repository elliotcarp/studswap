"use client";

// Blocks onboarding until the user has explicitly agreed to both the Terms
// of Service and the Peer Swap Agreement. Shown once, before profile setup,
// see src/app/onboarding/page.tsx, which checks User.acceptedTermsAt.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AcceptTermsGate() {
  const router = useRouter();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPeerAgreement, setAcceptedPeerAgreement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = acceptedTerms && acceptedPeerAgreement;

  async function handleContinue() {
    if (!canContinue) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/accept-terms", { method: "POST" });
      if (!res.ok) {
        setError("Could not save your acceptance. Please try again.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen justify-center">
      <div className="flex h-full w-full max-w-lg flex-col justify-center gap-6 p-6">
        <div>
          <span className="mb-3 block text-3xl">📄</span>
          <h1 className="font-display text-2xl font-bold">Before you continue</h1>
          <p className="mt-2 text-sm text-gray-500">
            StudSwap only works because both sides trust the arrangement. Please read and agree to
            these before setting up your profile.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
            <span className="text-sm text-gray-700">
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-riviera underline">
                Terms of Service
              </Link>
              .
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
            <input
              type="checkbox"
              checked={acceptedPeerAgreement}
              onChange={(e) => setAcceptedPeerAgreement(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
            <span className="text-sm text-gray-700">
              I understand that confirming a swap with another student forms a{" "}
              <Link href="/peer-agreement" target="_blank" className="text-riviera underline">
                Peer Swap Agreement
              </Link>{" "}
              directly between us. StudSwap is not a party to it.
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || submitting}
          className="rounded-full bg-gradient-to-r from-bloom to-riviera px-4 py-3 text-base font-medium text-white shadow-lg shadow-bloom/30 disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Agree and continue"}
        </button>
      </div>
    </div>
  );
}
