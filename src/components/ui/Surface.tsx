// Shared elevated-container primitive — every screen previously rebuilt
// `rounded-2xl bg-white shadow-md` (or similar) by hand. "tinted" is the
// soft brand-wash treatment the landing page's feature cards already use
// (skill .claude/SKILL.md §12: material weight encodes hierarchy — a
// tinted surface for something that should draw the eye, flat white for
// routine content).

import clsx from "clsx";
import type { ReactNode } from "react";

type SurfaceVariant = "flat" | "elevated" | "tinted";

export default function Surface({
  id,
  variant = "flat",
  className,
  onClick,
  children,
}: {
  id?: string;
  variant?: SurfaceVariant;
  className?: string;
  // Optional: makes the whole surface clickable (e.g. a list row whose
  // container should navigate somewhere while specific children inside it
  // still link elsewhere — see MatchesView/LikedView).
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={clsx(
        "rounded-card",
        variant === "flat" && "bg-white shadow-surface",
        variant === "elevated" && "bg-white shadow-elevated",
        variant === "tinted" && "bg-gradient-to-br from-riviera/10 via-bloom/5 to-spritz/10 shadow-surface",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
