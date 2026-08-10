"use client";

// Fetches GET /api/swaps and renders the confirmed-swap history: partner,
// place, dates, and the settlement amount to sort out directly with them.
// Each card links into the existing chat at /matches/[id] to keep
// discussing once everything is confirmed.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SwapSummary } from "@/types";
import { ArrowRightLeftIcon } from "@/components/icons";
import { SwapCardSkeleton } from "@/components/Skeleton";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatEuros(cents: number) {
  return `€${(cents / 100).toFixed(0)}`;
}

// StudSwap never moves this money — it's calculated and shown only, the two
// of you settle it directly between yourselves (see swap.otherPaymentHandle).
function settlementLine(swap: SwapSummary) {
  const name = swap.otherUser.name;
  const amount = formatEuros(swap.settlement.amountCents);
  if (swap.settlement.direction === "none") {
    return swap.matchType === "PAID" ? `${name} stayed at your flat, nothing owed.` : "Same value on both sides, nothing owed.";
  }
  if (swap.settlement.direction === "paid") {
    return swap.matchType === "PAID"
      ? `You owe ${name} ${amount} for the stay at their flat.`
      : `You owe ${name} ${amount} in fairness difference.`;
  }
  return swap.matchType === "PAID"
    ? `${name} owes you ${amount} for the stay at your flat.`
    : `${name} owes you ${amount} in fairness difference.`;
}

export default function SwapsView() {
  const [swaps, setSwaps] = useState<SwapSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/swaps")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load swaps");
        return res.json();
      })
      .then((data) => setSwaps(data.swaps))
      .catch(() => setError("Could not load your swaps. Please refresh."));
  }, []);

  return (
    <main className="flex flex-col p-6 pb-24 md:ml-56 md:pb-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-1 font-display text-2xl font-bold">Your swaps</h1>
        <p className="mb-4 text-sm text-gray-500">Confirmed swaps, with what's owed and who to reach.</p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {swaps === null && !error && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SwapCardSkeleton key={i} />
            ))}
          </div>
        )}

        {swaps?.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-riviera/10 via-bloom/5 to-spritz/10 px-6 py-20 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-bloom to-riviera shadow-lg shadow-bloom/30">
              <ArrowRightLeftIcon className="h-10 w-10 text-white" />
            </span>
            <div>
              <p className="text-lg font-semibold text-gray-800">No confirmed swaps yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                Once you and a match agree on dates and both confirm, the swap and its details show up here.
              </p>
            </div>
            <Link
              href="/swipe"
              className="mt-1 rounded-full bg-gradient-to-r from-bloom to-riviera px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-bloom/30"
            >
              Start swiping
            </Link>
          </div>
        )}

        <ul className="flex flex-col gap-4">
          {swaps?.map((swap) => (
            <li key={swap.matchId} className="overflow-hidden rounded-3xl border border-gray-200">
              <Link
                href={`/profile/${swap.otherUser.id}`}
                className="flex gap-3 p-4 hover:bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={swap.otherUser.photoUrl ?? "https://placehold.co/100x100?text=?"}
                  alt=""
                  className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    {swap.otherUser.name}
                    {swap.unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-spritz" />}
                  </p>
                  <p className="text-xs text-gray-500">
                    {swap.otherUser.university && `${swap.otherUser.university} · `}
                    {swap.city}
                    {swap.address ? ` · ${swap.address}` : ""}
                  </p>
                  <p className="mt-1.5 text-sm text-carbon-text">{settlementLine(swap)}</p>
                  {swap.settlement.amountCents > 0 && swap.otherPaymentHandle && (
                    <p className="mt-0.5 text-xs text-gray-400">Pay via: {swap.otherPaymentHandle}</p>
                  )}
                </div>
              </Link>

              <div className="bg-gradient-to-br from-riviera-strong via-bloom to-spritz p-4 text-sm text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-base">
                    ✅
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Validated</p>
                    <p className="font-display text-sm font-bold">
                      {formatDate(swap.stayFrom)} to {formatDate(swap.stayTo)}
                    </p>
                  </div>
                </div>
                {(swap.canRate || swap.lastMessage) && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {swap.canRate && (
                      <Link
                        href={`/matches/${swap.matchId}`}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-riviera-strong shadow"
                      >
                        Rate this swap
                      </Link>
                    )}
                    {swap.lastMessage && (
                      <Link
                        href={`/matches/${swap.matchId}`}
                        className={`truncate text-xs underline decoration-white/40 underline-offset-2 ${
                          swap.unread ? "font-semibold text-white" : "text-white/80"
                        }`}
                      >
                        {swap.lastMessage}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
