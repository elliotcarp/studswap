"use client";

// Shared building blocks for "what does confirming actually do", used by
// both ConfirmReviewModal (before confirming) and SwapRecapModal (a
// read-only replay of the same information, reachable any time after via
// TripDetails' "View swap details" button), so the two never drift apart.

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { estimateSuggestedDepositCents } from "@/lib/pricing";

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

// Appended to a price whenever one's shown, so the number is never floating
// without the stay length it's for — null (no dates yet, e.g. an early
// draft preview) just omits the clause rather than showing a wrong one.
function forStayClause(days: number | null): string {
  return days != null ? ` for your ${days}-night stay` : "";
}

export function previewLine(
  preview: SettlementPreview,
  isMePaying: boolean,
  otherUserName: string,
  tense: PreviewTense,
  days: number | null = null
): string | null {
  if (!preview || preview.amountCents <= 0 || !preview.payerId) {
    return "Same value on both sides. Nothing to settle.";
  }
  const amount = formatEuros(preview.amountCents);
  const stay = forStayClause(days);
  if (tense === "conditional") {
    return isMePaying
      ? `You'd owe ${otherUserName} ${amount}${stay}.`
      : `${otherUserName} would owe you ${amount}${stay}.`;
  }
  return isMePaying
    ? `You owe ${otherUserName} ${amount}${stay}. StudSwap doesn't collect or move this, pay them directly using the payment details they've shared.`
    : `${otherUserName} owes you ${amount}${stay}. StudSwap doesn't collect or move this, they'll pay you directly.`;
}

export function SettlementCard({
  preview,
  isMePaying,
  otherUserName,
  tense = "conditional",
  stayFrom,
  stayTo,
}: {
  preview: SettlementPreview;
  isMePaying: boolean;
  otherUserName: string;
  tense?: PreviewTense;
  stayFrom: string;
  stayTo: string;
}) {
  const line = previewLine(preview, isMePaying, otherUserName, tense, stayDurationDays(stayFrom, stayTo));
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
        underway, no need to ask. This is used as insurance in case of late cancellation,{" "}
        <Link href="/fees" target="_blank" className="font-medium text-riviera underline">
          see exactly how that works
        </Link>
        . The <strong>{formatEuros(charge.serviceFeeCents)}</strong> you actually end up paying is
        StudSwap's fee for making this match happen.
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

// A rate per accommodation actually at stake, one entry for a PAID stay
// (the owner's flat, since only the payer occupies anywhere), two for a
// MUTUAL swap (each side occupies the other's flat, so each has its own
// suggested figure). Empty when neither side has typed or listed a price yet.
export type DepositRate = { label: string; pricePerDayCents: number };

// Small and collapsed by default (in ConfirmReviewModal, where it's one more
// thing on a screen about to charge a card) so it reads as a low-key
// optional extra, not another obligation. defaultOpen lets TripDetails open
// it by default instead, since that's the chat/propose screen where working
// out a deposit with your match is actually the point.
export function DepositEstimateCard({ rates, defaultOpen = false }: { rates: DepositRate[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (rates.length === 0) return null;

  const amounts = rates.map((r) => estimateSuggestedDepositCents(r.pricePerDayCents));
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const headline = min === max ? formatEuros(min) : `${formatEuros(min)} to ${formatEuros(max)}`;

  return (
    <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white/95 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-gray-700">
          Suggested deposit: <strong>{headline}</strong> <span className="text-gray-400">(optional)</span>
        </span>
        <span className="flex-shrink-0 font-medium text-riviera">{open ? "Hide" : "See more"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-200 px-3 py-2">
          <p className="text-gray-700">
            Not collected or held by StudSwap. If you'd both like some protection against damage, agree the
            actual amount (or skip it entirely) directly between yourselves, e.g. using the{" "}
            <Link href="/damage-deposit-agreement" target="_blank" className="font-medium text-riviera underline">
              Damage Deposit Agreement template
            </Link>
            .
          </p>
          <ul className="mt-2 space-y-1 text-gray-600">
            {rates.map((r) => (
              <li key={r.label}>
                {r.label}: about{" "}
                <strong>{formatEuros(estimateSuggestedDepositCents(r.pricePerDayCents))}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Who's confirmed so far, used inside ConfirmReviewModal so the thing you're
// about to pay for shows the other side's status too, not just your own
// pending action.
export function ConfirmedStatusRow({
  confirmedByMe,
  confirmedByOther,
  otherUserName,
}: {
  confirmedByMe: boolean;
  confirmedByOther: boolean;
  otherUserName: string;
}) {
  const pill = (label: string, confirmed: boolean) => (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        confirmed ? "bg-highlighter text-highlighter-ink" : "bg-gray-100 text-gray-500"
      }`}
    >
      {confirmed ? "✅ " : "⏳ "}
      {label}
    </span>
  );
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {pill("You", confirmedByMe)}
      {pill(otherUserName, confirmedByOther)}
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
