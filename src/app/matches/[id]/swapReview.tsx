// Shared building blocks for "what does confirming actually do" — used by
// both ConfirmReviewModal (before confirming) and SwapRecapModal (a
// read-only replay of the same information, reachable any time after via
// TripDetails' "View swap details" button), so the two never drift apart.

import type { ReactNode } from "react";
import Link from "next/link";

export type SettlementPreview = { amountCents: number; payerId: string | null } | null;
export type ConfirmationCharge = { totalCents: number; serviceFeeCents: number; refundableCents: number };

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatEuros(cents: number) {
  return `€${(cents / 100).toFixed(0)}`;
}

export function stayDurationDays(stayFrom: string, stayTo: string) {
  const ms = new Date(stayTo).getTime() - new Date(stayFrom).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// Beyond the Peer Swap Agreement (which is between the two users, not
// binding on either's landlord), longer stays typically cross into what
// most rental contracts treat as subletting rather than a short guest
// visit, which usually needs the landlord's written consent, not just a
// heads up. Bucketed on nights, not tied to any one country's rules, since
// StudSwap users rent under many different jurisdictions.
export function legalNextStep(days: number, otherUserName: string): { title: string; body: string } {
  if (days >= 30) {
    return {
      title: "Next: get sublet permission before move-in",
      body: `A stay of ${days} nights is long enough that most rental contracts treat it as subletting, not a guest visit. Before ${otherUserName} moves in, check your lease and get your landlord's written consent, most jurisdictions require this above roughly a month, and it usually goes by a name specific to your local tenancy law. We'd also recommend a short written sublease between you two covering rent pass-through, duration, and who's liable for damage, on top of this Peer Swap Agreement.`,
    };
  }
  if (days >= 14) {
    return {
      title: "Next: check your lease's guest policy",
      body: `A stay of ${days} nights is usually still a "guest," not a formal sublet, but many leases cap unregistered guest stays (often around 2 weeks) or require notifying your landlord or building management. Worth a quick check before ${otherUserName} arrives, so it doesn't conflict with your contract.`,
    };
  }
  return {
    title: "Next: you're basically done",
    body: `A stay of ${days} night${days === 1 ? "" : "s"} falls well within what most leases allow for guests without needing to notify your landlord. Just make sure ${otherUserName} knows building access and any house rules. The Peer Swap Agreement above covers the rest.`,
  };
}

export function StayDatesCard({ stayFrom, stayTo }: { stayFrom: string; stayTo: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Stay dates</p>
      <p className="mt-1 font-display text-lg font-bold text-gray-900">
        {formatDate(stayFrom)} to {formatDate(stayTo)}
      </p>
    </div>
  );
}

// "conditional": a live draft preview before proposing ("would"). "final":
// dates are proposed/agreed, or the match has validated — either way this is
// what StudSwap calculated to settle, framed as something the two of you
// still need to sort out yourselves, never as money StudSwap is holding.
export type PreviewTense = "conditional" | "final";

export function previewLine(
  preview: SettlementPreview,
  isMePaying: boolean,
  otherUserName: string,
  tense: PreviewTense
): string | null {
  if (!preview || preview.amountCents <= 0 || !preview.payerId) {
    return "Same value on both sides. Nothing to settle.";
  }
  const amount = formatEuros(preview.amountCents);
  if (tense === "conditional") {
    return isMePaying
      ? `You'd owe ${otherUserName} ${amount}. Settle it directly between yourselves.`
      : `${otherUserName} would owe you ${amount}. Settle it directly between yourselves.`;
  }
  return isMePaying
    ? `You owe ${otherUserName} ${amount}. StudSwap doesn't collect or move this. Pay them directly using the payment details they've shared.`
    : `${otherUserName} owes you ${amount}. StudSwap doesn't collect or move this. They'll pay you directly.`;
}

export function SettlementCard({
  preview,
  isMePaying,
  otherUserName,
  tense = "conditional",
}: {
  preview: SettlementPreview;
  isMePaying: boolean;
  otherUserName: string;
  tense?: PreviewTense;
}) {
  const line = previewLine(preview, isMePaying, otherUserName, tense);
  return (
    <div className="mt-3 rounded-2xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Settlement</p>
      <p className="mt-1 text-sm text-gray-700">{line}</p>
    </div>
  );
}

export function FeeCard({ charge, otherUserName }: { charge: ConfirmationCharge; otherUserName: string }) {
  return (
    <div className="mt-3 rounded-2xl bg-riviera/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-riviera-strong">
        Really, it's {formatEuros(charge.serviceFeeCents)}
      </p>
      <p className="mt-1 text-sm text-gray-700">
        We charge <strong>{formatEuros(charge.totalCents)}</strong> now, but{" "}
        <strong>{formatEuros(charge.refundableCents)}</strong> comes straight back to you once your stay's
        underway, no need to ask. The <strong>{formatEuros(charge.serviceFeeCents)}</strong> you actually
        end up paying is StudSwap's fee for making this match happen.
      </p>
      <ul className="mt-2 space-y-1 text-xs text-gray-500">
        <li>
          • <strong>{formatEuros(charge.refundableCents)}</strong> refundable, auto-refunded to your card a day
          into the stay.
        </li>
        <li>
          • <strong>{formatEuros(charge.serviceFeeCents)}</strong> service fee, keeps StudSwap running.
        </li>
        <li>
          • It's also what keeps both of you honest: if {otherUserName} cancels on you late, their{" "}
          {formatEuros(charge.refundableCents)} becomes yours. If you cancel late, yours goes to them. Exact
          terms are in the Peer Swap Agreement below.
        </li>
      </ul>
    </div>
  );
}

export function ObligationsCard({ otherUserName, children }: { otherUserName: string; children?: ReactNode }) {
  return (
    <div className="mt-3 rounded-2xl border border-gray-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Your obligations to {otherUserName}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-600">
        <li>You have the right to offer your flat for these dates, matching your listing.</li>
        <li>You'll provide access and a point of contact by the stay's start date.</li>
        <li>You'll treat their flat with reasonable care and respect house rules.</li>
      </ul>
      <Link href="/peer-agreement" target="_blank" className="mt-2 inline-block text-xs font-medium text-riviera underline">
        Read the full Peer Swap Agreement
      </Link>
      {children}
    </div>
  );
}

export function LegalNextStepCard({
  stayFrom,
  stayTo,
  otherUserName,
}: {
  stayFrom: string;
  stayTo: string;
  otherUserName: string;
}) {
  const days = stayDurationDays(stayFrom, stayTo);
  const step = legalNextStep(days, otherUserName);
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{step.title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{step.body}</p>
      <p className="mt-2 text-[11px] italic text-gray-400">
        General guidance, not legal advice. Rules vary by landlord and country.
      </p>
    </div>
  );
}
