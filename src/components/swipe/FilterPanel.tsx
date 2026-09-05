"use client";

// Filter panel for the swipe screen: destination city, a flexible trip-date
// range (matched against candidates by overlap rather than requiring exact
// dates), and minimum group size. Bottom sheet on mobile — draggable via
// the handle, 1:1 with the finger (skill §2), rubber-banding past fully
// open (§9), momentum-projected dismiss-vs-snap-back on release (§5–6).
// Centered modal on desktop, no drag there (matches the panel's own
// items-end/md:items-center split).

import { useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import CityPicker from "@/components/CityPicker";
import ChipSelect from "@/components/onboarding/ChipSelect";
import { ACCOMMODATES_OPTIONS } from "@/lib/onboardingOptions";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { CandidateFilters } from "@/types";
import { SPRING_DEFAULT, SPRING_MOMENTUM, project, rubberband, usePrefersReducedMotion } from "@/lib/motion";
import Button from "@/components/ui/Button";

// Past this fraction of the sheet's own height, or this fast downward,
// release commits to dismiss instead of snapping back open.
const DISMISS_HEIGHT_RATIO = 0.3;
const DISMISS_VELOCITY = 700; // px/s

// A short position/timestamp history for release velocity (skill §2: track
// history, not just the current point — you need velocity at release).
interface Sample {
  y: number;
  t: number;
}

export default function FilterPanel({
  filters,
  onApply,
  onClose,
}: {
  filters: CandidateFilters;
  onApply: (filters: CandidateFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CandidateFilters>(filters);
  const reducedMotion = usePrefersReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  // Drives the sheet's own translateY: 0 = fully open. Bound via style={{
  // y }} below, so declarative initial/animate/exit props (open/close) and
  // the imperative animate() calls during drag-release (this function)
  // read and write the exact same value — Framer Motion is built for this,
  // it's the same pattern SwipeCardStack.tsx uses for its `x`.
  const y = useMotionValue(0);
  const dragState = useRef<{ pointerId: number; startClientY: number; startY: number; history: Sample[] } | null>(
    null
  );
  const closingRef = useRef(false);

  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    onClose();
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (reducedMotion || closingRef.current) return;
    const el = handleRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startY: y.get(),
      history: [{ y: e.clientY, t: e.timeStamp }],
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const rawDelta = drag.startY + (e.clientY - drag.startClientY);
    const height = sheetRef.current?.offsetHeight ?? 400;
    // Dragging up past "fully open" has nowhere to go — resist it (§9)
    // instead of a hard stop. Dragging down toward dismiss tracks 1:1.
    y.set(rawDelta < 0 ? -rubberband(-rawDelta, height) : rawDelta);

    drag.history.push({ y: e.clientY, t: e.timeStamp });
    if (drag.history.length > 5) drag.history.shift();
  }

  function releaseVelocity(history: Sample[]): number {
    if (history.length < 2) return 0;
    const first = history[0];
    const last = history[history.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return 0;
    return (last.y - first.y) / dt; // px/s
  }

  function handlePointerUp(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragState.current = null;

    const velocityY = releaseVelocity(drag.history);
    const height = sheetRef.current?.offsetHeight ?? 400;
    const projectedY = y.get() + project(velocityY);
    const shouldDismiss = velocityY > DISMISS_VELOCITY || projectedY > height * DISMISS_HEIGHT_RATIO;

    if (shouldDismiss) {
      // Animate fully offscreen first, then unmount — a drag-dismiss and a
      // button/scrim-dismiss should look identical either way, this just
      // gets there by finishing the gesture's own motion instead of
      // replaying AnimatePresence's separate exit animation from scratch.
      animate(y, height, { ...SPRING_MOMENTUM, velocity: velocityY, onComplete: requestClose });
    } else {
      animate(y, 0, { ...SPRING_DEFAULT, velocity: velocityY });
    }
  }

  // Tap the scrim to close, same as every other modal — but skip it while
  // a drag is live so a drag that ends over the scrim doesn't also fire a click.
  function handleScrimClick() {
    if (dragState.current) return;
    requestClose();
  }

  return (
    <motion.div
      className="glass-scrim fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
      onClick={handleScrimClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reducedMotion ? { duration: 0.15 } : SPRING_DEFAULT}
    >
      <motion.div
        ref={sheetRef}
        style={{ y }}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-gradient-to-br from-riviera-strong via-bloom to-spritz p-6 text-white md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 600 }}
        transition={reducedMotion ? { duration: 0.15 } : SPRING_DEFAULT}
      >
        <div
          ref={handleRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="-mx-6 -mt-2 mb-2 flex cursor-grab touch-none flex-col items-center pb-2 pt-1 active:cursor-grabbing md:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-white/40" />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Filters</h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="text-xl text-white/70 transition-transform active:scale-90 hover:text-white"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Destination city</span>
            <CityPicker
              value={draft.city}
              onChange={(city) => setDraft((prev) => ({ ...prev, city }))}
              placeholder="e.g. Barcelona"
              light
            />
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
              Your trip dates
              <InfoTooltip text="When YOU want to go away. We'll show flats that are free during this window, not your own flat's availability." />
            </p>
            <div className="mt-1.5 flex gap-2">
              <div className="flex-1">
                <label htmlFor="filter-trip-from" className="sr-only">
                  Trip from
                </label>
                <input
                  id="filter-trip-from"
                  type="date"
                  value={draft.tripFrom}
                  onChange={(e) => setDraft((prev) => ({ ...prev, tripFrom: e.target.value }))}
                  className="w-full rounded-xl border-0 bg-white/95 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="filter-trip-to" className="sr-only">
                  Trip to
                </label>
                <input
                  id="filter-trip-to"
                  type="date"
                  min={draft.tripFrom || undefined}
                  value={draft.tripTo}
                  onChange={(e) => setDraft((prev) => ({ ...prev, tripTo: e.target.value }))}
                  className="w-full rounded-xl border-0 bg-white/95 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-overlap" className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Minimum overlap (days)
              </label>
              <InfoTooltip text="A swap only works if your dates and theirs overlap. This is how flexible you are, rather than requiring an exact match." />
            </div>
            <input
              id="filter-overlap"
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.minOverlapDays}
              onChange={(e) => setDraft((prev) => ({ ...prev, minOverlapDays: e.target.value }))}
              className="w-full rounded-xl border-0 bg-white/95 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white sm:w-32"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Minimum group size</span>
            <ChipSelect
              options={ACCOMMODATES_OPTIONS}
              value={draft.minAccommodates}
              onChange={(value) => setDraft((prev) => ({ ...prev, minAccommodates: value }))}
              light
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="onGradient" onClick={() => onApply(draft)} className="flex-1">
            Apply filters
          </Button>
          <Button
            variant="onGradientGhost"
            onClick={() =>
              setDraft({ city: "", tripFrom: "", tripTo: "", minOverlapDays: "0", minAccommodates: "1" })
            }
          >
            Reset
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
