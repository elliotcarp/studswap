"use client";

// Shared motion vocabulary for the app's fluid-interface pass (see
// .claude/SKILL.md "apple-design" at the repo root). Every gesture-driven
// or transition-driven component should reach for these instead of
// inlining its own spring constants or duplicating the reduced-motion
// check — see SwipeCardStack.tsx, ConfirmReviewModal.tsx, MatchReveal.tsx,
// FilterPanel.tsx, OnboardingWizard.tsx.

import { useEffect, useState } from "react";

// Typed as literal object types (not Framer Motion's broad `Transition`
// union) so spreading them into an `animate(value, target, { ...SPRING_X,
// velocity, onComplete })` call keeps TypeScript's discriminated-union
// narrowing on `type: "spring"` intact — widening to `Transition` loses
// that and every spread call site fails to typecheck.

// Critically damped (Apple's damping 1.0): reaches the target with no
// overshoot. The default for anything that wasn't just flicked — menus,
// modals, step transitions.
export const SPRING_DEFAULT = { type: "spring", bounce: 0, duration: 0.4 } as const;

// Slightly under-damped (Apple's damping ~0.8): a little overshoot, used
// only when the motion was preceded by a gesture that carried real
// momentum (a drag release, a flick) — see skill §4's "only when the
// gesture itself carried momentum" rule. Never use this for a menu that
// just faded in.
export const SPRING_MOMENTUM = { type: "spring", bounce: 0.2, duration: 0.4 } as const;

// Critically damped but faster — for AnimatePresence content swaps using
// mode="wait" (e.g. wizard steps), where the outgoing element's full exit
// plays before the incoming one starts, so the *effective* gap a user
// waits through is roughly double a single SPRING_DEFAULT transition.
// Skill §1: response is the foundation everything else is built on, and
// latency on a path the user hits repeatedly (Next, Next, Next) is a
// regression even when the individual animation is otherwise correct.
export const SPRING_QUICK = { type: "spring", bounce: 0, duration: 0.2 } as const;

// Momentum projection (skill §6): where a flick would come to rest if let
// to decelerate naturally, in px. decelerationRate matches Apple's sample
// code (~0.998 for a normal scroll feel, 0.99 for something snappier).
// NOT the physics-textbook v^2/(2*decel) form — this exponential-decay
// form is what Apple actually ships.
export function project(initialVelocity: number, decelerationRate = 0.998): number {
  return (initialVelocity / 1000) * (decelerationRate / (1 - decelerationRate));
}

// Rubber-banding (skill §9): progressive resistance past a boundary,
// instead of a hard stop. `overshoot` is how far past the edge the
// gesture is trying to go; `dimension` is the size of the resisting
// region (e.g. sheet height); returns the actual (damped) displacement.
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  const sign = overshoot < 0 ? -1 : 1;
  const magnitude = Math.abs(overshoot);
  return (sign * (magnitude * dimension * constant)) / (dimension + constant * magnitude);
}

// prefers-reduced-motion, tracked live (not just read once) so a user who
// toggles it mid-session (or a component mounted before the media query
// resolved) still gets it right. Every new spring/gesture component
// should branch on this instead of re-deriving its own matchMedia check.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
