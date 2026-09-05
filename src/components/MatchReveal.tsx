"use client";

// The "Swap Stamp": the one moment this app spends its visual boldness on.
// Two ID-style cards slide in from opposite edges and meet in the middle,
// then the route stamps down between them. Unlike confetti, the route pill
// ("Berlin ⇄ Lausanne") is a persistent, nameable artifact, the actual
// shareable unit, not the animation itself.

import Link from "next/link";
import { motion } from "framer-motion";
import { SPRING_MOMENTUM, usePrefersReducedMotion } from "@/lib/motion";
import Button from "@/components/ui/Button";

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
  const reducedMotion = usePrefersReducedMotion();
  // This is the app's one deliberate flourish (see file comment) — a touch
  // of overshoot suits it even though nothing here was actually flicked
  // (skill §4 reserves bounce for momentum-driven interactions, but also
  // frames it as "the emotion you want people to feel," and a match is
  // explicitly that kind of moment).
  const cardTransition = reducedMotion ? { duration: 0.2 } : SPRING_MOMENTUM;

  return (
    <motion.div
      className="glass-scrim fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reducedMotion ? { duration: 0.15 } : cardTransition}
    >
      <motion.div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-riviera-strong via-bloom to-spritz p-8 text-center text-white shadow-2xl"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
        transition={cardTransition}
      >
        <p className="mb-6 font-display text-lg font-bold">{matchType === "MUTUAL" ? "You matched!" : "Like accepted!"}</p>

        {matchType === "MUTUAL" ? (
          <div className="relative mb-6 flex h-28 items-center justify-center">
            <motion.div
              className="absolute flex h-20 w-28 flex-col justify-between rounded-lg bg-riviera-strong p-2.5 text-left font-mono text-[11px] shadow-lg"
              initial={reducedMotion ? false : { x: -96, rotate: -6 }}
              animate={{ x: -12, rotate: -2 }}
              transition={cardTransition}
            >
              <span className="text-sm font-bold">{cityCode(myCity)}</span>
              <span className="opacity-80">YOU</span>
            </motion.div>
            <motion.div
              className="absolute flex h-20 w-28 flex-col justify-between rounded-lg bg-spritz p-2.5 text-left font-mono text-[11px] text-[#2A0F06] shadow-lg"
              initial={reducedMotion ? false : { x: 96, rotate: 6 }}
              animate={{ x: 12, rotate: 2 }}
              transition={cardTransition}
            >
              <span className="text-sm font-bold">{cityCode(otherCity)}</span>
              <span className="truncate opacity-80">{otherName.toUpperCase()}</span>
            </motion.div>
            <motion.div
              className="absolute whitespace-nowrap rounded-md bg-highlighter px-4 py-2 font-mono text-sm font-extrabold text-highlighter-ink shadow-lg"
              initial={{ scale: reducedMotion ? 1 : 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                reducedMotion ? { duration: 0.15 } : { ...SPRING_MOMENTUM, delay: 0.35 }
              }
            >
              {cityCode(myCity)} ⇄ {cityCode(otherCity)}
            </motion.div>
          </div>
        ) : (
          <motion.div
            className="mb-6 flex justify-center"
            initial={{ scale: reducedMotion ? 1 : 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={cardTransition}
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-4xl">🔑</span>
          </motion.div>
        )}

        <p className="mb-6 text-white/90">
          {matchType === "MUTUAL"
            ? "Say hi and sort out the details."
            : `${otherName} will pay to stay at your flat. Say hi and sort out the details.`}
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href={`/matches/${matchId}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-riviera-strong shadow-surface transition-transform active:scale-95"
          >
            Start chatting
          </Link>
          <Button variant="onGradientText" onClick={onClose}>
            Keep browsing
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
