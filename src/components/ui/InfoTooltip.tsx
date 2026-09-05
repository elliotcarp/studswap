"use client";

// A small "?" affordance that reveals an explanation on tap or hover,
// instead of that explanation sitting as a permanent paragraph under every
// label it applies to. Styled for a light label on a dark surface (see
// FilterPanel.tsx) — pass a className to restyle for a light background.

import { useState } from "react";
import clsx from "clsx";

export default function InfoTooltip({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label="More info"
        aria-expanded={open}
        className={clsx(
          "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold leading-none text-white",
          className
        )}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-10 mt-1.5 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-2 text-xs font-normal leading-snug text-white shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
