"use client";

// Trip-details panel shown above the chat: agree on stay dates (and
// optionally a negotiated price/day), then each side independently pays the
// €25 confirmation charge. Polls in the background so the other side paying
// (or the stay validating) shows up without the page needing a manual reload.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RatingPrompt from "./RatingPrompt";
import ConfirmReviewModal from "./ConfirmReviewModal";
import SwapRecapModal from "./SwapRecapModal";
import { formatDate, formatEuros, previewLine, type ConfirmationCharge, type SettlementPreview } from "./swapReview";

const POLL_INTERVAL_MS = 4000;

interface CancellationPreview {
  outcome: "REFUNDED" | "FORFEITED";
  forfeitedCents: number;
}

interface CancellationRecord {
  cancelledByMe: boolean;
  cancelledAt: string;
  daysNotice: number;
  outcome: "REFUNDED" | "FORFEITED";
  forfeitedCents: number;
  myPayoutStatus: "PENDING" | "PAID" | null;
  needsPayoutOnboarding: boolean;
  payoutLastAttemptAt: string | null;
}

// Matches SUPPORTED_COUNTRIES in /api/user/payouts/onboard.
const PAYOUT_COUNTRIES = [
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" },
  { code: "IE", label: "Ireland" },
  { code: "DK", label: "Denmark" },
  { code: "SE", label: "Sweden" },
  { code: "FI", label: "Finland" },
  { code: "PL", label: "Poland" },
  { code: "CZ", label: "Czechia" },
  { code: "HU", label: "Hungary" },
  { code: "GR", label: "Greece" },
  { code: "LU", label: "Luxembourg" },
  { code: "GB", label: "United Kingdom" },
];

type Pricing =
  | { kind: "PAID"; ownerPricePerDayCents: number | null; negotiatedPricePerDayCents: number | null }
  | {
      kind: "MUTUAL";
      myPricePerDayCents: number | null;
      otherPricePerDayCents: number | null;
      myNegotiatedPricePerDayCents: number | null;
      otherNegotiatedPricePerDayCents: number | null;
    };

interface MatchDetail {
  matchId: string;
  type: "MUTUAL" | "PAID";
  status: "PENDING" | "VALIDATED" | "CANCELLED";
  stayFrom: string | null;
  stayTo: string | null;
  negotiatedPricePerDayCentsPaid: number | null;
  myNegotiatedPricePerDayCents: number | null;
  otherNegotiatedPricePerDayCents: number | null;
  confirmedByMe: boolean;
  confirmedByOther: boolean;
  otherUserName: string;
  otherPaymentHandle: string | null;
  isPayer: boolean | null;
  windowFrom: string;
  windowTo: string;
  pricing: Pricing;
  settlement: SettlementPreview;
  settlementIsMePaying: boolean;
  settlementMarkedPaidByPayer: boolean;
  settlementConfirmedReceivedByPayee: boolean;
  confirmationCharge: ConfirmationCharge;
  myRefundableStatus: "PENDING" | "REFUNDED" | "FORFEITED";
  otherRefundableStatus: "PENDING" | "REFUNDED" | "FORFEITED";
  cancellationPreview: CancellationPreview | null;
  cancellation: CancellationRecord | null;
  completedProcessedAt: string | null;
  ratingWindowClosesAt: string | null;
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

// Shared by the draft preview below: null until both dates are typed and
// stayTo is actually after stayFrom.
function daysBetween(fromStr: string, toStr: string): number | null {
  if (!fromStr || !toStr) return null;
  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  if (!(toDate.getTime() > fromDate.getTime())) return null;
  return Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
}

function parseEurosInputToCents(input: string): number | null {
  const trimmed = input.trim();
  const euros = trimmed && Number.isFinite(Number(trimmed)) && Number(trimmed) > 0 ? Number(trimmed) : null;
  return euros != null ? Math.round(euros * 100) : null;
}

// Live settlement estimate from whatever's currently typed in the propose
// form, before it's actually proposed, mirroring the same math the server
// applies to a persisted stayFrom/stayTo (see /api/matches/[id]/route.ts),
// just computed client-side against draft values. PAID negotiates one price
// (the owner's flat); MUTUAL negotiates each side's own flat independently,
// so there's still a real fairness gap to compute, not one shared rate that
// always zeroes it out.
function computeDraftPreview(
  pricing: Pricing,
  fromStr: string,
  toStr: string,
  paidPriceInput: string,
  myPriceInput: string,
  otherPriceInput: string,
  isPayer: boolean | null
): { amountCents: number; iAmPaying: boolean } | null {
  const days = daysBetween(fromStr, toStr);
  if (days == null) return null;

  if (pricing.kind === "PAID") {
    const rate = parseEurosInputToCents(paidPriceInput) ?? pricing.ownerPricePerDayCents;
    if (rate == null) return null;
    // The flat owner is never the one paying — only the side who liked/
    // accepted one-directionally is.
    return { amountCents: rate * days, iAmPaying: isPayer === true };
  }

  const myRate = parseEurosInputToCents(myPriceInput) ?? pricing.myPricePerDayCents;
  const otherRate = parseEurosInputToCents(otherPriceInput) ?? pricing.otherPricePerDayCents;
  if (myRate == null || otherRate == null) return null;
  const myTotal = myRate * days;
  const otherTotal = otherRate * days;
  if (myTotal === otherTotal) return { amountCents: 0, iAmPaying: false };
  // Whoever's OWN flat is worth more is owed the difference — see
  // matchValidation.ts — so if MY flat is pricier, the OTHER side pays me.
  return { amountCents: Math.abs(myTotal - otherTotal), iAmPaying: myTotal < otherTotal };
}

export default function TripDetails({ matchId }: { matchId: string }) {
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [paidPrice, setPaidPrice] = useState(""); // PAID only: the owner's flat
  const [myPrice, setMyPrice] = useState(""); // MUTUAL only: my own flat
  const [otherPrice, setOtherPrice] = useState(""); // MUTUAL only: the other side's flat
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [settlementBusy, setSettlementBusy] = useState(false);
  const [payoutCountry, setPayoutCountry] = useState("DE");
  const [payoutBusy, setPayoutBusy] = useState(false);
  const checkoutNotice = searchParams.get("confirm"); // "success" | "cancelled" | null, back from Stripe
  const payoutNotice = searchParams.get("payout"); // "onboarded" | null, back from Stripe Connect onboarding

  async function startPayoutOnboarding() {
    setPayoutBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/payouts/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: payoutCountry, returnTo: matchId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setError(data?.error ?? "Could not start payout setup.");
        setPayoutBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start payout setup. Please try again.");
      setPayoutBusy(false);
    }
  }

  // syncDraft resets the propose-form inputs to match the server (safe right
  // after our own action, or on first load); background polling passes
  // false so it can't overwrite dates/price the user is mid-typing.
  function load(syncDraft: boolean) {
    fetch(`/api/matches/${matchId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: MatchDetail) => {
        setDetail(data);
        if (syncDraft) {
          setFrom(data.stayFrom ? toDateInputValue(data.stayFrom) : toDateInputValue(data.windowFrom));
          setTo(data.stayTo ? toDateInputValue(data.stayTo) : toDateInputValue(data.windowTo));
          setPaidPrice(
            data.negotiatedPricePerDayCentsPaid != null ? String(data.negotiatedPricePerDayCentsPaid / 100) : ""
          );
          setMyPrice(
            data.myNegotiatedPricePerDayCents != null ? String(data.myNegotiatedPricePerDayCents / 100) : ""
          );
          setOtherPrice(
            data.otherNegotiatedPricePerDayCents != null ? String(data.otherNegotiatedPricePerDayCents / 100) : ""
          );
          setEditing(!data.stayFrom);
        }
      })
      .catch(() => {
        // Best-effort: the chat still works even if this panel fails to load.
      });
  }

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function propose() {
    setBusy(true);
    setError(null);
    try {
      const body =
        detail?.type === "PAID"
          ? { stayFrom: from, stayTo: to, pricePerDayCents: parseEurosInputToCents(paidPrice) }
          : {
              stayFrom: from,
              stayTo: to,
              myPricePerDayCents: parseEurosInputToCents(myPrice),
              otherPricePerDayCents: parseEurosInputToCents(otherPrice),
            };
      const res = await fetch(`/api/matches/${matchId}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not propose these terms.");
        return;
      }
      setEditing(false);
      load(true);
    } finally {
      setBusy(false);
    }
  }

  async function switchToMutual() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/convert-to-mutual`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not switch to a mutual swap.");
        return;
      }
      load(true);
    } finally {
      setBusy(false);
    }
  }

  async function cancelSwap() {
    setCancelBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not cancel this swap.");
        return;
      }
      setCancelling(false);
      load(true);
    } finally {
      setCancelBusy(false);
    }
  }

  async function markSettlement(action: "mark_paid" | "confirm_received") {
    setSettlementBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not update settlement status.");
        return;
      }
      load(false);
    } finally {
      setSettlementBusy(false);
    }
  }

  if (!detail) return null;

  if (detail.status === "CANCELLED") {
    const c = detail.cancellation;
    return (
      <div className="border-b bg-gray-50 p-5 text-sm">
        {payoutNotice === "onboarded" && (
          <p className="mb-3 rounded-lg bg-riviera/10 px-3 py-2 text-xs font-medium text-riviera-strong">
            Payout setup complete. If you're owed money, it's on its way, refresh in a moment if it doesn't
            update automatically.
          </p>
        )}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg">
            🚫
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cancelled</p>
            <p className="font-display text-lg font-bold text-gray-800">
              {c ? `${c.cancelledByMe ? "You" : detail.otherUserName} cancelled this swap` : "This swap was cancelled"}
            </p>
          </div>
        </div>

        {c && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">
              Cancelled {formatDate(c.cancelledAt)},{" "}
              {c.daysNotice >= 0
                ? `${Math.floor(c.daysNotice)} day${Math.floor(c.daysNotice) === 1 ? "" : "s"} before the stay was due to start`
                : "after the stay was due to start"}
            </p>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              {c.cancelledByMe ? (
                c.outcome === "REFUNDED" ? (
                  <p className="text-gray-700">
                    That's more than 7 days' notice, so your {formatEuros(detail.confirmationCharge.refundableCents)}{" "}
                    refundable portion was refunded to you. {detail.otherUserName}'s own{" "}
                    {formatEuros(detail.confirmationCharge.refundableCents)} was refunded to them too, it was never
                    at risk.
                  </p>
                ) : (
                  <p className="text-gray-700">
                    That's inside the 7-day notice window, so your{" "}
                    {formatEuros(c.forfeitedCents)} refundable portion was forfeited to {detail.otherUserName}{" "}
                    instead of refunded to you.
                  </p>
                )
              ) : c.outcome === "REFUNDED" ? (
                <p className="text-gray-700">
                  {detail.otherUserName} gave more than 7 days' notice, so their{" "}
                  {formatEuros(detail.confirmationCharge.refundableCents)} refundable portion was refunded to them.
                  Your own {formatEuros(detail.confirmationCharge.refundableCents)} was refunded to you too, it was
                  never at risk.
                </p>
              ) : (
                <>
                  <p className="text-gray-700">
                    {detail.otherUserName} cancelled inside the 7-day notice window, so their{" "}
                    {formatEuros(c.forfeitedCents)} refundable portion was forfeited to you instead of refunded to
                    them.
                  </p>
                  {c.myPayoutStatus === "PENDING" && c.needsPayoutOnboarding && (
                    <div className="mt-3 rounded-xl bg-riviera/5 p-3">
                      <p className="text-xs text-gray-700">
                        Set up payouts to receive it. This is a quick Stripe form (bank details, ID), one time
                        only.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          value={payoutCountry}
                          onChange={(e) => setPayoutCountry(e.target.value)}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                        >
                          {PAYOUT_COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={startPayoutOnboarding}
                          disabled={payoutBusy}
                          className="rounded-full bg-riviera px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {payoutBusy ? "Redirecting…" : `Set up payouts to get ${formatEuros(c.forfeitedCents)}`}
                        </button>
                      </div>
                    </div>
                  )}
                  {c.myPayoutStatus === "PENDING" && !c.needsPayoutOnboarding && (
                    <p className="mt-2 text-xs text-amber-700">
                      Your payout account is set up.{" "}
                      {c.payoutLastAttemptAt
                        ? `We last tried sending it on ${formatDate(c.payoutLastAttemptAt)}.`
                        : "We're sending it now."}{" "}
                      This can take a few days to arrive while funds clear. We'll keep retrying automatically, no
                      action needed from you.
                    </p>
                  )}
                  {c.myPayoutStatus === "PAID" && (
                    <p className="mt-2 text-xs text-green-700">This has already been paid out to you.</p>
                  )}
                </>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Either way, nobody's {formatEuros(detail.confirmationCharge.serviceFeeCents)} service fee is
                refunded, it's non-refundable from the moment it's charged.
              </p>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>
    );
  }

  const checkoutNoticeBanner = checkoutNotice === "cancelled" && (
    <p className="mb-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-gray-700">
      Checkout was cancelled. You haven't been charged.
    </p>
  );

  const cancelSection = detail.cancellationPreview && (
    <div className="mt-3">
      {cancelling ? (
        <div className="rounded-2xl bg-white/95 p-3 shadow-inner">
          {detail.cancellationPreview.outcome === "REFUNDED" ? (
            <p className="text-xs text-gray-600">
              Cancelling now: your {formatEuros(detail.confirmationCharge.refundableCents)} refundable portion is
              refunded to you. {detail.otherUserName}'s is refunded to them too.
            </p>
          ) : (
            <p className="text-xs text-red-700">
              It's late notice: your {formatEuros(detail.cancellationPreview.forfeitedCents)} refundable portion is
              forfeited to {detail.otherUserName} instead of refunded to you. Their own refundable portion is
              refunded to them either way.
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={cancelSwap}
              disabled={cancelBusy}
              className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Yes, cancel swap
            </button>
            <button
              type="button"
              onClick={() => setCancelling(false)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-500"
            >
              Never mind
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCancelling(true)}
          className="text-xs font-medium text-white/70 underline decoration-white/40 underline-offset-2 hover:text-white"
        >
          Cancel swap
        </button>
      )}
    </div>
  );

  // Only the flat owner (who received and accepted the like) can offer to
  // switch this to a real swap, not the payer, who already opted into
  // paying one-directionally and may not want to offer their own flat.
  const switchToMutualButton = detail.type === "PAID" && detail.status === "PENDING" && detail.isPayer === false && (
    <button
      type="button"
      onClick={switchToMutual}
      disabled={busy}
      className="text-left text-xs font-medium text-white/90 underline decoration-white/40 underline-offset-2 disabled:opacity-50 hover:text-white"
    >
      Prefer to swap flats instead of paying? Switch to a mutual match
    </button>
  );

  const confirmedPill = (label: string, confirmed: boolean) => (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        confirmed ? "bg-highlighter text-highlighter-ink" : "bg-white/15 text-white/80"
      }`}
    >
      {confirmed ? "✅ " : "⏳ "}
      {label}
    </span>
  );

  // Only reachable once both sides have paid to confirm — before that
  // there's nothing settled to recap, just a proposal either side could
  // still change.
  const recapButton = detail.status === "VALIDATED" && detail.stayFrom && detail.stayTo && (
    <button
      type="button"
      onClick={() => setShowRecap(true)}
      className="text-left text-xs font-medium text-white/80 underline decoration-white/40 underline-offset-2 hover:text-white"
    >
      View swap details
    </button>
  );

  const recapModal = showRecap && detail.stayFrom && detail.stayTo && (
    <SwapRecapModal
      otherUserName={detail.otherUserName}
      isMePaying={detail.settlementIsMePaying}
      stayFrom={detail.stayFrom}
      stayTo={detail.stayTo}
      isComplete={detail.completedProcessedAt != null}
      settlement={detail.settlement}
      confirmationCharge={detail.confirmationCharge}
      onClose={() => setShowRecap(false)}
    />
  );

  if (detail.status === "VALIDATED") {
    const line = previewLine(detail.settlement, detail.settlementIsMePaying, detail.otherUserName, "final");
    const settlementOwed = detail.settlement && detail.settlement.amountCents > 0 && detail.settlement.payerId;
    const settlementActionButton =
      settlementOwed &&
      (detail.settlementIsMePaying
        ? !detail.settlementMarkedPaidByPayer && (
            <button
              type="button"
              onClick={() => markSettlement("mark_paid")}
              disabled={settlementBusy}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-riviera-strong shadow disabled:opacity-50"
            >
              Mark as paid
            </button>
          )
        : !detail.settlementConfirmedReceivedByPayee && (
            <button
              type="button"
              onClick={() => markSettlement("confirm_received")}
              disabled={settlementBusy}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-riviera-strong shadow disabled:opacity-50"
            >
              Confirm received
            </button>
          ));

    return (
      <>
        <div className="border-b bg-gradient-to-br from-riviera-strong via-bloom to-spritz p-5 text-sm text-white">
          {checkoutNoticeBanner}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-lg">
              ✅
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Validated</p>
              <p className="font-display text-lg font-bold">
                {detail.stayFrom && formatDate(detail.stayFrom)} to {detail.stayTo && formatDate(detail.stayTo)}
              </p>
            </div>
          </div>
          <div className="mt-3">{line && <p className="text-white/90">{line}</p>}</div>
          {detail.otherPaymentHandle && (
            <p className="mt-1 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/90">
              {detail.otherUserName}'s payment details: <strong>{detail.otherPaymentHandle}</strong>
            </p>
          )}
          {settlementActionButton && <div className="mt-2">{settlementActionButton}</div>}
          {settlementOwed && (detail.settlementMarkedPaidByPayer || detail.settlementConfirmedReceivedByPayee) && (
            <p className="mt-1 text-xs text-white/70">
              {detail.settlementMarkedPaidByPayer ? "Marked paid. " : ""}
              {detail.settlementConfirmedReceivedByPayee ? "Confirmed received." : ""}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            {recapButton}
            {!detail.completedProcessedAt && cancelSection}
          </div>
        </div>
        {detail.completedProcessedAt && (
          <RatingPrompt matchId={detail.matchId} otherUserName={detail.otherUserName} />
        )}
        {recapModal}
      </>
    );
  }

  const someoneAlreadyPaid = detail.confirmedByMe || detail.confirmedByOther;
  const draftDays = daysBetween(from, to);
  const draftPreviewRaw = computeDraftPreview(detail.pricing, from, to, paidPrice, myPrice, otherPrice, detail.isPayer);
  const draftPreview: SettlementPreview = draftPreviewRaw
    ? { amountCents: draftPreviewRaw.amountCents, payerId: draftPreviewRaw.iAmPaying ? "me" : "other" }
    : null;
  const draftIsMePaying = draftPreviewRaw?.iAmPaying ?? false;
  const draftLine = previewLine(draftPreview, draftIsMePaying, detail.otherUserName, "conditional");
  const proposedLine = previewLine(detail.settlement, detail.settlementIsMePaying, detail.otherUserName, "final");

  return (
    <div className="border-b bg-gradient-to-br from-riviera-strong via-bloom to-spritz p-5 text-sm text-white">
      {checkoutNoticeBanner}
      {editing ? (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Agree on stay dates</p>
            <div className="mt-1.5 flex gap-2">
              <input
                type="date"
                value={from}
                min={toDateInputValue(detail.windowFrom)}
                max={toDateInputValue(detail.windowTo)}
                onChange={(e) => setFrom(e.target.value)}
                className="flex-1 rounded-xl border-0 bg-white/95 px-2.5 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
              />
              <input
                type="date"
                value={to}
                min={from || toDateInputValue(detail.windowFrom)}
                max={toDateInputValue(detail.windowTo)}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 rounded-xl border-0 bg-white/95 px-2.5 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
          {detail.type === "PAID" ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Negotiate a price/day (optional)
              </p>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                value={paidPrice}
                onChange={(e) => setPaidPrice(e.target.value)}
                placeholder="Leave blank to use the listed price"
                className="mt-1.5 w-full rounded-xl border-0 bg-white/95 px-2.5 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white sm:w-64"
              />
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Settle on a price for each flat (optional)
              </p>
              <p className="mt-0.5 text-xs text-white/60">
                Leave either blank to use the listed price. This just settles what each flat is worth for the
                fairness difference, StudSwap never charges it.
              </p>
              <div className="mt-1.5 flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-white/70">Your flat</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    value={myPrice}
                    onChange={(e) => setMyPrice(e.target.value)}
                    placeholder="Listed price"
                    className="mt-0.5 w-full rounded-xl border-0 bg-white/95 px-2.5 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-white/70">{detail.otherUserName}'s flat</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    value={otherPrice}
                    onChange={(e) => setOtherPrice(e.target.value)}
                    placeholder="Listed price"
                    className="mt-0.5 w-full rounded-xl border-0 bg-white/95 px-2.5 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>
              </div>
            </div>
          )}
          {draftDays != null && draftLine && <p className="text-white/90">{draftLine}</p>}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={propose}
              disabled={busy || !from || !to}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-riviera-strong shadow disabled:opacity-50"
            >
              Propose
            </button>
            {detail.stayFrom && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white"
              >
                Cancel
              </button>
            )}
          </div>
          {switchToMutualButton}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-lg">
              📅
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Proposed stay</p>
              <p className="font-display text-lg font-bold">
                {detail.stayFrom && formatDate(detail.stayFrom)} to {detail.stayTo && formatDate(detail.stayTo)}
              </p>
            </div>
          </div>
          {detail.type === "PAID" && detail.negotiatedPricePerDayCentsPaid != null && (
            <p className="text-white/90">Negotiated price: {formatEuros(detail.negotiatedPricePerDayCentsPaid)}/day</p>
          )}
          {detail.pricing.kind === "MUTUAL" &&
            (detail.myNegotiatedPricePerDayCents != null || detail.otherNegotiatedPricePerDayCents != null) && (
              <p className="text-white/90">
                Your flat: {formatEuros(detail.myNegotiatedPricePerDayCents ?? detail.pricing.myPricePerDayCents ?? 0)}
                /day. {detail.otherUserName}'s flat:{" "}
                {formatEuros(detail.otherNegotiatedPricePerDayCents ?? detail.pricing.otherPricePerDayCents ?? 0)}/day.
              </p>
            )}
          {proposedLine && <p className="text-white/90">{proposedLine}</p>}
          <div className="flex flex-wrap gap-2">
            {confirmedPill("You", detail.confirmedByMe)}
            {confirmedPill(detail.otherUserName, detail.confirmedByOther)}
          </div>
          <p className="text-xs text-white/80">
            {!detail.confirmedByMe
              ? "Happy with these terms? Review and confirm."
              : `Waiting for ${detail.otherUserName} to confirm.`}
          </p>
          <div className="flex gap-2">
            {!detail.confirmedByMe && (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={busy}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-riviera-strong shadow disabled:opacity-50"
              >
                Confirm
              </button>
            )}
            {!someoneAlreadyPaid && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full border border-white/40 px-4 py-2 text-xs font-medium text-white"
              >
                Propose different terms
              </button>
            )}
          </div>
          {switchToMutualButton}
          {cancelSection}
        </div>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
      )}
      {showConfirmModal && detail.stayFrom && detail.stayTo && (
        <ConfirmReviewModal
          matchId={matchId}
          otherUserName={detail.otherUserName}
          isMePaying={detail.settlementIsMePaying}
          stayFrom={detail.stayFrom}
          stayTo={detail.stayTo}
          settlement={detail.settlement}
          confirmationCharge={detail.confirmationCharge}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
