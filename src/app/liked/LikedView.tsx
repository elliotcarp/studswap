"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LikerSummary, MatchSummary } from "@/types";
import MatchReveal from "@/components/MatchReveal";
import MatchStatusPill from "@/components/MatchStatusPill";
import { HeartIcon } from "@/components/icons";
import { Skeleton } from "@/components/Skeleton";

const EXPLAINER_SEEN_KEY = "studswap:seenLikedExplainer";

export default function LikedView({ myCity }: { myCity: string }) {
  const [likers, setLikers] = useState<LikerSummary[] | null>(null);
  // Already-accepted one-directional connections (PAID matches, either side
  // accepted): these never had a mutual swipe, so they stay here rather than
  // on the Matches page, which is mutual-matches only.
  const [connections, setConnections] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<{
    matchId: string;
    otherName: string;
    otherCity: string;
    matchType: "MUTUAL" | "PAID";
  } | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);

  useEffect(() => {
    fetch("/api/likes")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load likes");
        return res.json();
      })
      .then((data) => {
        setLikers(data.likers);
        setConnections(data.connections);
      })
      .catch(() => setError("Could not load your likes. Please refresh."));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(EXPLAINER_SEEN_KEY)) {
      setShowExplainer(true);
    }
  }, []);

  function dismissExplainer() {
    localStorage.setItem(EXPLAINER_SEEN_KEY, "1");
    setShowExplainer(false);
  }

  async function likeBack(liker: LikerSummary) {
    setBusyUserId(liker.userId);
    try {
      const res = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: liker.userId, direction: "RIGHT" }),
      });
      const data = await res.json();
      setLikers((prev) => (prev ? prev.filter((l) => l.userId !== liker.userId) : prev));
      if (data?.matched) {
        setMatch({ matchId: data.matchId, otherName: liker.name, otherCity: liker.homeCity, matchType: "MUTUAL" });
      }
    } finally {
      setBusyUserId(null);
    }
  }

  // This just opens a chat — no money moves through StudSwap here or ever
  // for the stay itself. Once you both agree on dates in chat, the stay
  // cost (your price x those dates) is shown to both of you to settle
  // directly between yourselves; you can still switch to a mutual swap from
  // there later if you change your mind (see TripDetails).
  async function accept(liker: LikerSummary) {
    setBusyUserId(liker.userId);
    setError(null);
    try {
      const res = await fetch(`/api/likes/${liker.userId}/redeem`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not complete that.");
        return;
      }
      setLikers((prev) => (prev ? prev.filter((l) => l.userId !== liker.userId) : prev));
      setMatch({ matchId: data.matchId, otherName: liker.name, otherCity: liker.homeCity, matchType: "PAID" });
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <main className="flex flex-col p-6 pb-24 md:ml-56 md:pb-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Liked you</h1>
        </div>

        {showExplainer && (
          <div className="relative mb-4 rounded-2xl border border-riviera/20 bg-riviera/5 p-4">
            <button
              type="button"
              onClick={dismissExplainer}
              aria-label="Dismiss"
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <p className="pr-6 text-sm font-semibold text-riviera">Two ways to respond</p>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-gray-600">
              <li>
                <span className="font-medium text-gray-800">Like back:</span> swipe them right too. If they
                also liked you, it is a mutual match and you swap flats with each other.
              </li>
              <li>
                <span className="font-medium text-gray-800">Accept:</span> skip matching back and let them stay
                at your flat, paying your asking price directly to you, no swipe needed from you.
              </li>
            </ul>
            <button
              type="button"
              onClick={dismissExplainer}
              className="mt-3 text-xs font-medium text-riviera underline"
            >
              Got it
            </button>
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {likers === null && !error && (
          <ul className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                <Skeleton className="h-16 w-16 flex-shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
                <div className="flex flex-shrink-0 flex-col gap-1.5">
                  <Skeleton className="h-7 w-20 rounded-lg" />
                  <Skeleton className="h-7 w-20 rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {likers?.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-bloom/10">
              <HeartIcon className="h-8 w-8 text-bloom" />
            </span>
            <div>
              <p className="font-medium text-gray-700">No likes yet</p>
              <p className="mt-1 text-sm text-gray-400">
                Keep your profile fresh and check back. Anyone who likes you shows up here.
              </p>
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {likers?.map((liker) => {
            const busy = busyUserId === liker.userId;
            return (
              <li key={liker.userId} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                <Link href={`/profile/${liker.userId}`} className="flex min-w-0 flex-1 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={liker.photoUrl ?? "https://placehold.co/100x100?text=?"}
                    alt=""
                    className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{liker.name}</p>
                    <p className="text-sm text-gray-500">
                      They'd pay €{(liker.pricePerDayCents / 100).toFixed(0)}/day · ~€
                      {(liker.totalPriceCents / 100).toFixed(0)} total
                    </p>
                  </div>
                </Link>
                <div className="flex flex-shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => likeBack(liker)}
                    disabled={busy}
                    className="rounded-lg bg-riviera px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Like back
                  </button>
                  <button
                    type="button"
                    onClick={() => accept(liker)}
                    disabled={busy}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40"
                  >
                    Accept
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {connections != null && connections.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 font-display text-lg font-bold">Accepted</h2>
            <ul className="flex flex-col divide-y">
              {connections.map((conn) => (
                <li key={conn.matchId} className="flex items-center gap-3 py-3">
                  <Link href={`/profile/${conn.otherUser.id}`} className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={conn.otherUser.photoUrl ?? "https://placehold.co/100x100?text=?"}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${conn.otherUser.id}`} className="flex items-center gap-2">
                      <p className="min-w-0 truncate font-medium">{conn.otherUser.name}</p>
                      <MatchStatusPill matchType={conn.matchType} isPayer={conn.isPayer} />
                    </Link>
                    <Link href={`/matches/${conn.matchId}`} className="flex items-center gap-1.5">
                      <p className={`truncate text-sm ${conn.unread ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                        {conn.lastMessage ?? "Say hi!"}
                      </p>
                      {conn.unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-spritz" />}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {match && (
        <MatchReveal
          matchId={match.matchId}
          myCity={myCity}
          otherName={match.otherName}
          otherCity={match.otherCity}
          matchType={match.matchType}
          onClose={() => setMatch(null)}
        />
      )}
    </main>
  );
}
