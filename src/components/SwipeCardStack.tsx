"use client";

// Renders a stack of <ProfileCard /> with Framer Motion drag gestures.
// - Drag past a horizontal threshold -> animate off-screen -> fire onSwipe(direction)
// - The like/pass buttons are overlaid on top of the card and trigger the same
//   exit animation via the top card's imperative handle (see Card below).
// - Show LIKE/PASS overlay labels based on drag distance
// - The parent owns the `profiles` list; it removes a profile once onSwipe fires,
//   which naturally advances the stack (no internal index state needed here).

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import type { PanInfo } from "framer-motion";
import type { ProfileCardData, SwipeDirection } from "@/types";
import ProfileCard from "./ProfileCard";
import { FlameIcon } from "./icons";
import { SPRING_DEFAULT, SPRING_MOMENTUM, project, usePrefersReducedMotion } from "@/lib/motion";

const SWIPE_THRESHOLD = 100; // px
const EXIT_DISTANCE = 500; // px, floor for how far off-screen a card travels
// Synthetic release velocity for a button tap (no real gesture happened),
// so the Like/Pass buttons feel like the same flick a fast drag would be,
// not a different, flatter animation — see motion.ts's SPRING_MOMENTUM.
const BUTTON_TAP_VELOCITY = 1200; // px/s

interface CardHandle {
  triggerExit: (direction: SwipeDirection) => void;
}

interface SwipeCardStackProps {
  profiles: ProfileCardData[];
  onSwipe: (userId: string, direction: SwipeDirection) => void;
}

export default function SwipeCardStack({ profiles, onSwipe }: SwipeCardStackProps) {
  // Only the top 3 are rendered for visual depth / perf; earlier ones have
  // already been swiped away by the parent.
  const visible = profiles.slice(0, 3);
  const topCardRef = useRef<CardHandle | null>(null);

  if (visible.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-16 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-bloom to-riviera shadow-lg shadow-bloom/30">
          <FlameIcon className="h-10 w-10 text-white" />
        </span>
        <div>
          <p className="font-display text-xl font-bold text-gray-800">That&apos;s everyone for now</p>
          <p className="mt-1 max-w-xs text-sm text-gray-400">
            New listings post daily. Check back soon, or widen your dates and cities to see more.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      {[...visible].reverse().map((profile, reversedIndex) => {
        const stackIndex = visible.length - 1 - reversedIndex;
        const isTop = stackIndex === 0;
        return (
          <Card
            key={profile.userId}
            ref={isTop ? topCardRef : undefined}
            profile={profile}
            stackIndex={stackIndex}
            isTop={isTop}
            onSwipe={onSwipe}
          />
        );
      })}

      {/* Overlaid on the card, not a separate row: a scrim behind the
          buttons keeps them legible over whatever scrolls underneath, and
          the card's own bottom padding (see ProfileCard) keeps its last
          section clear of this zone. rounded-b-card matches ProfileCard's
          own bottom corners — this scrim sits outside that card's
          overflow-hidden wrapper (it's a sibling, not a child, so the
          buttons stay clickable above the card's own scroll), so without
          this its square corners poke past the card's rounded ones. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center gap-6 overflow-hidden rounded-b-card bg-gradient-to-t from-white/90 via-white/60 to-transparent pb-5 pt-10">
        <button
          type="button"
          onClick={() => topCardRef.current?.triggerExit("LEFT")}
          aria-label="Pass"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-spritz text-2xl text-white shadow-lg shadow-spritz/40 transition-transform active:scale-90"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => topCardRef.current?.triggerExit("RIGHT")}
          aria-label="Interested"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-bloom to-riviera text-2xl text-white shadow-lg shadow-bloom/40 transition-transform active:scale-90"
        >
          ✓
        </button>
      </div>
    </div>
  );
}

const Card = forwardRef<
  CardHandle,
  {
    profile: ProfileCardData;
    stackIndex: number;
    isTop: boolean;
    onSwipe: (userId: string, direction: SwipeDirection) => void;
  }
>(function Card({ profile, stackIndex, isTop, onSwipe }, ref) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-15, 15]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);
  const [exiting, setExiting] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // velocityX: the gesture's actual release velocity (px/s) for a drag, or
  // a synthetic "as if flicked" one for a button tap — either way this is
  // handed straight to the spring (velocity handoff, skill §5) so there's
  // no seam between how the card was moving and how it leaves.
  function exit(direction: SwipeDirection, velocityX = direction === "RIGHT" ? BUTTON_TAP_VELOCITY : -BUTTON_TAP_VELOCITY) {
    if (exiting) return;
    setExiting(true);
    const sign = direction === "RIGHT" ? 1 : -1;
    if (reducedMotion) {
      // No spring/momentum under reduced motion — a quick, flat fade-out
      // instead (skill §14: cross-fade, drop elastic/overshoot).
      animate(x, sign * EXIT_DISTANCE, {
        duration: 0.15,
        ease: "easeOut",
        onComplete: () => onSwipe(profile.userId, direction),
      });
      return;
    }
    // Project where this velocity would naturally land (skill §6), floored
    // at EXIT_DISTANCE so a slow deliberate drag-past-threshold (near-zero
    // release velocity) still fully clears the screen instead of stopping
    // just past the threshold.
    const target = sign * Math.max(EXIT_DISTANCE, Math.abs(project(velocityX)));
    animate(x, target, {
      ...SPRING_MOMENTUM,
      velocity: velocityX,
      onComplete: () => onSwipe(profile.userId, direction),
    });
  }

  useImperativeHandle(ref, () => ({ triggerExit: (direction: SwipeDirection) => exit(direction) }));

  function handleDragStart() {
    // Grabbing the card again mid-exit interrupts the in-flight animation
    // (Framer Motion hands x back to the pointer automatically), but
    // `exiting` would otherwise stay stuck true forever, since the
    // interrupted animation's onComplete never fires — leaving the next
    // release silently ignored. Resetting here is what makes the card
    // actually interruptible (skill §3), not just draggable.
    setExiting(false);
  }

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (exiting) return;
    const offsetX = info.offset.x;

    if (Math.abs(offsetX) < SWIPE_THRESHOLD) {
      // Hand off velocity here too: a partial drag released with momentum
      // should snap back carrying that momentum, not from a standing start.
      animate(x, 0, reducedMotion ? { duration: 0.15 } : { ...SPRING_DEFAULT, velocity: info.velocity.x });
      return;
    }

    exit(offsetX > 0 ? "RIGHT" : "LEFT", info.velocity.x);
  }

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: 1 - stackIndex * 0.04,
        top: stackIndex * 8,
        zIndex: 10 - stackIndex,
        // Let vertical touch scroll (to read prompts/photos) pass through natively
        // while framer motion still owns horizontal drag-to-swipe.
        touchAction: "pan-y",
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ProfileCard profile={profile} />
      {isTop && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="pointer-events-none absolute left-4 top-4 -rotate-12 rounded-lg border-4 border-riviera px-3 py-1 font-display text-xl font-bold text-riviera"
          >
            LIKE
          </motion.div>
          <motion.div
            style={{ opacity: passOpacity }}
            className="pointer-events-none absolute right-4 top-4 rotate-12 rounded-lg border-4 border-carbon px-3 py-1 font-display text-xl font-bold text-carbon-text"
          >
            PASS
          </motion.div>
        </>
      )}
    </motion.div>
  );
});
