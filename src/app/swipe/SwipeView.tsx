"use client";

// Fetches candidate profiles (GET /api/profile), renders <SwipeCardStack />,
// posts swipes to POST /api/swipe. On a mutual RIGHT swipe, the API response
// signals a match -> show match modal -> link to /matches/[id]

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import SwipeCardStack from "@/components/SwipeCardStack";
import FilterPanel from "@/components/swipe/FilterPanel";
import MatchReveal from "@/components/MatchReveal";
import ProfileCompletionBanner from "@/components/ProfileCompletionBanner";
import { ProfileCardSkeleton } from "@/components/Skeleton";
import Button from "@/components/ui/Button";
import type { CandidateFilters, ProfileCardData, SwipeDirection } from "@/types";

function buildQuery(filters: CandidateFilters): string {
  const params = new URLSearchParams();
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.tripFrom) params.set("tripFrom", filters.tripFrom);
  if (filters.tripTo) params.set("tripTo", filters.tripTo);
  if (filters.minOverlapDays) params.set("minOverlapDays", filters.minOverlapDays);
  if (filters.minStayDays) params.set("minStayDays", filters.minStayDays);
  if (filters.minAccommodates) params.set("minAccommodates", filters.minAccommodates);
  return params.toString();
}

function countActive(filters: CandidateFilters): number {
  let n = 0;
  if (filters.city.trim()) n++;
  if (Number(filters.minOverlapDays) > 0) n++;
  if (Number(filters.minStayDays) > 0) n++;
  if (Number(filters.minAccommodates) > 1) n++;
  return n;
}

export default function SwipeView({
  defaultTripFrom,
  defaultTripTo,
  myCity,
  selfPhotoCount: initialSelfPhotoCount,
  flatPhotoCount: initialFlatPhotoCount,
  promptCount: initialPromptCount,
  hasPaymentMethod: initialHasPaymentMethod,
}: {
  defaultTripFrom: string;
  defaultTripTo: string;
  myCity: string;
  selfPhotoCount: number;
  flatPhotoCount: number;
  promptCount: number;
  hasPaymentMethod: boolean;
}) {
  const [filters, setFilters] = useState<CandidateFilters>({
    city: "",
    tripFrom: defaultTripFrom,
    tripTo: defaultTripTo,
    minOverlapDays: "0",
    minStayDays: "0",
    minAccommodates: "1",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [profiles, setProfiles] = useState<ProfileCardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<{ matchId: string; otherName: string; otherCity: string } | null>(null);
  const [completion, setCompletion] = useState({
    selfPhotoCount: initialSelfPhotoCount,
    flatPhotoCount: initialFlatPhotoCount,
    promptCount: initialPromptCount,
    hasPaymentMethod: initialHasPaymentMethod,
  });

  // The server-rendered initial counts above can go stale if the profile was
  // edited on /profile and the browser served this page back out of Next's
  // client-side Router Cache — this re-fetches fresh on every mount (i.e.
  // every time someone navigates here) so the banner below never shows
  // counts that have already been fixed.
  useEffect(() => {
    fetch("/api/user/photo-counts")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCompletion(data))
      .catch(() => {
        // Best-effort: keep showing the server-rendered counts on failure.
      });
  }, []);

  useEffect(() => {
    setProfiles(null);
    setError(null);
    fetch(`/api/profile?${buildQuery(filters)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profiles");
        return res.json();
      })
      .then((data) => setProfiles(data.profiles))
      .catch(() => setError("Could not load flats to swipe on. Please refresh."));
  }, [filters]);

  const handleSwipe = useCallback((userId: string, direction: SwipeDirection) => {
    const swiped = profiles?.find((p) => p.userId === userId);
    setProfiles((prev) => (prev ? prev.filter((p) => p.userId !== userId) : prev));

    fetch("/api/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: userId, direction }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.matched && swiped) {
          setMatch({ matchId: data.matchId, otherName: swiped.name, otherCity: swiped.homeCity });
        }
      })
      .catch(() => {
        // Best-effort: the swipe UI has already moved on regardless.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles]);

  const activeCount = countActive(filters);

  return (
    <main className="app-bg flex h-screen flex-col p-4 pb-24 md:ml-56 md:pb-6">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-chalk">Discover flats</h1>
        <Button variant="secondary" onClick={() => setShowFilters(true)} className="!px-4 !py-2 text-sm">
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-riviera text-xs text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      <ProfileCompletionBanner
        selfPhotoCount={completion.selfPhotoCount}
        flatPhotoCount={completion.flatPhotoCount}
        promptCount={completion.promptCount}
        hasPaymentMethod={completion.hasPaymentMethod}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {profiles === null && !error ? (
        <ProfileCardSkeleton />
      ) : (
        <SwipeCardStack profiles={profiles ?? []} onSwipe={handleSwipe} />
      )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <FilterPanel
            key="filters"
            filters={filters}
            onClose={() => setShowFilters(false)}
            onApply={(next) => {
              setFilters(next);
              setShowFilters(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {match && (
          <MatchReveal
            key="match-reveal"
            matchId={match.matchId}
            myCity={myCity}
            otherName={match.otherName}
            otherCity={match.otherCity}
            matchType="MUTUAL"
            onClose={() => setMatch(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
