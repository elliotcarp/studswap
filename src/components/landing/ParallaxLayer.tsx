"use client";

// Wraps the hero backdrop and nudges it a few px opposite the cursor, the
// cheap trick that makes a static scene feel like it has depth. Skipped
// entirely under prefers-reduced-motion, and inert on touch (no mousemove).
import { useEffect, useRef } from "react";

export default function ParallaxLayer({
  children,
  strength = 16,
}: {
  children: React.ReactNode;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    function handleMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (el) el.style.transform = `translate3d(${x * strength}px, ${y * strength * 0.5}px, 0)`;
    }

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [strength]);

  // Oversized relative to the section (-inset-8 = 32px overscan on every
  // side, comfortably more than the ±16px/±8px max translate below) so
  // nudging it toward the cursor never uncovers a bare edge of the
  // section's own background underneath.
  return (
    <div ref={ref} className="absolute -inset-8 will-change-transform" style={{ transition: "transform 0.4s ease-out" }}>
      {children}
    </div>
  );
}
