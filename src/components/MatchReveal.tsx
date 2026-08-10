"use client";

// The "Swap Stamp": the one moment this app spends its visual boldness on.
// Two ID-style cards slide in from opposite edges and meet in the middle,
// then the route stamps down between them. Unlike confetti, the route pill
// ("Berlin ⇄ Lausanne") is a persistent, nameable artifact, the actual
// shareable unit, not the animation itself.

import { useEffect, useState } from "react";
import Link from "next/link";

function cityCode(city: string) {
  return city.slice(0, 3).toUpperCase();
}

export default function MatchReveal({
  matchId,
  myCity,
  otherName,
  otherCity,
  matchType,
  onClose,
}: {
  matchId: string;
  myCity: string;
  otherName: string;
  otherCity: string;
  // MUTUAL: both sides swiped right, a real swap. PAID: accepting a pending
  // like without swiping back, the liker pays to stay at the accepter's flat
  // (see LikedView's accept()); there's no swap here, so this must not claim
  // one, and skips the two-city stamp visual, which would imply otherwise.
  matchType: "MUTUAL" | "PAID";
  onClose: () => void;
}) {
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setStamped(true);
      return;
    }
    const id = requestAnimationFrame(() => setStamped(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-riviera-strong via-bloom to-spritz p-8 text-center text-white shadow-2xl">
        <p className="mb-6 font-display text-lg font-bold">{matchType === "MUTUAL" ? "You matched!" : "Like accepted!"}</p>

        {matchType === "MUTUAL" ? (
          <div className="relative mb-6 flex h-28 items-center justify-center">
            <div
              className={`motion-reduce:transition-none absolute flex h-20 w-28 flex-col justify-between rounded-lg bg-riviera-strong p-2.5 text-left font-mono text-[11px] shadow-lg transition-transform duration-700 ease-out ${
                stamped ? "-translate-x-3 -rotate-2" : "-translate-x-24 -rotate-6"
              }`}
            >
              <span className="text-sm font-bold">{cityCode(myCity)}</span>
              <span className="opacity-80">YOU</span>
            </div>
            <div
              className={`motion-reduce:transition-none absolute flex h-20 w-28 flex-col justify-between rounded-lg bg-spritz p-2.5 text-left font-mono text-[11px] text-[#2A0F06] shadow-lg transition-transform duration-700 ease-out ${
                stamped ? "translate-x-3 rotate-2" : "translate-x-24 rotate-6"
              }`}
            >
              <span className="text-sm font-bold">{cityCode(otherCity)}</span>
              <span className="truncate opacity-80">{otherName.toUpperCase()}</span>
            </div>
            <div
              className={`motion-reduce:transition-none motion-reduce:delay-0 absolute whitespace-nowrap rounded-md bg-highlighter px-4 py-2 font-mono text-sm font-extrabold text-highlighter-ink shadow-lg transition-all delay-500 duration-300 ${
                stamped ? "scale-100 opacity-100" : "scale-50 opacity-0"
              }`}
            >
              {cityCode(myCity)} ⇄ {cityCode(otherCity)}
            </div>
          </div>
        ) : (
          <div
            className={`mb-6 flex justify-center transition-all duration-500 ease-out ${
              stamped ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-4xl">🔑</span>
          </div>
        )}

        <p className="mb-6 text-white/90">
          {matchType === "MUTUAL"
            ? "Say hi and sort out the details."
            : `${otherName} will pay to stay at your flat. Say hi and sort out the details.`}
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href={`/matches/${matchId}`}
            className="rounded-full bg-white px-4 py-3 font-medium text-riviera-strong"
          >
            Start chatting
          </Link>
          <button type="button" onClick={onClose} className="rounded-full px-4 py-3 font-medium text-white/80">
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
