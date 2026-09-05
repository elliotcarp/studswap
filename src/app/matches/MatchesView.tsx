"use client";

// Fetches GET /api/matches and renders the list. The row itself opens the
// chat at /matches/[id]; only the avatar and name opt out to /profile/[id]
// instead (via stopPropagation so the row's own click doesn't also fire).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MatchSummary } from "@/types";
import MatchStatusPill from "@/components/MatchStatusPill";
import Avatar from "@/components/Avatar";
import { HeartHandshakeIcon } from "@/components/icons";
import { ListSkeleton } from "@/components/Skeleton";
import Surface from "@/components/ui/Surface";

export default function MatchesView() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/matches")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load matches");
        return res.json();
      })
      .then((data) => setMatches(data.matches))
      .catch(() => setError("Could not load your matches. Please refresh."));
  }, []);

  return (
    <main className="app-bg flex flex-col p-6 pb-24 md:ml-56 md:pb-6">
      <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-5 font-display text-3xl font-bold text-chalk">Your matches</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {matches === null && !error && <ListSkeleton />}

      {matches?.length === 0 && (
        <Surface className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-riviera/15 to-bloom/15">
            <HeartHandshakeIcon className="h-8 w-8 text-riviera" />
          </span>
          <div>
            <p className="font-medium text-gray-700">No matches yet</p>
            <p className="mt-1 text-sm text-gray-400">Keep swiping to find your flat swap!</p>
          </div>
        </Surface>
      )}

      <ul className="flex flex-col gap-2">
        {matches?.map((match) => (
          <li key={match.matchId}>
            <Surface
              className="flex items-center gap-3 p-3"
              onClick={() => router.push(`/matches/${match.matchId}`)}
            >
              <Link
                href={`/profile/${match.otherUser.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0"
              >
                <Avatar src={match.otherUser.photoUrl} className="h-14 w-14 rounded-full" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profile/${match.otherUser.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2"
                >
                  <p className="min-w-0 truncate font-medium">{match.otherUser.name}</p>
                  <MatchStatusPill matchType={match.matchType} isPayer={match.isPayer} />
                </Link>
                <div className="flex items-center gap-1.5">
                  <p className={`truncate text-sm ${match.unread ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                    {match.lastMessage ?? "Say hi!"}
                  </p>
                  {/* Highlighter reads too pale against white to work as a status dot
                      (fine as a large fill, not as an 8px mark), spritz has the
                      contrast this actually needs to be seen. */}
                  {match.unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-spritz" />}
                </div>
              </div>
            </Surface>
          </li>
        ))}
      </ul>
      </div>
    </main>
  );
}
