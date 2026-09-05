"use client";

// Shared button primitive — the app previously had none (every screen
// hand-rolled its own button classes), which was a big part of why the
// authenticated app read as visually flat next to the landing page. Three
// variants: primary (the gradient CTA already used ad hoc everywhere,
// now actually shared), secondary (outlined), ghost (text-only). Tap
// feedback (skill .claude/SKILL.md §1: respond on press, not release) is
// built in here once instead of re-added per call site.

import { forwardRef } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "onGradient" | "onGradientGhost" | "onGradientText";
type ButtonShape = "pill" | "circle";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  shape?: ButtonShape;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-bloom to-riviera text-white shadow-elevated shadow-bloom/20 disabled:shadow-none",
  secondary: "border border-carbon-line bg-white text-chalk shadow-surface",
  ghost: "text-riviera",
  danger: "bg-red-600 text-white shadow-surface",
  // For buttons sitting directly on a saturated brand-gradient background
  // (e.g. FilterPanel's sheet) where the default variants' own colors would
  // disappear into it.
  onGradient: "bg-white text-riviera-strong shadow-surface",
  onGradientGhost: "bg-white/15 text-white",
  onGradientText: "text-white/80",
};

const SHAPE_CLASSES: Record<ButtonShape, string> = {
  pill: "rounded-full px-5 py-3 text-sm font-semibold",
  circle: "h-14 w-14 rounded-full text-2xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", shape = "pill", className, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        VARIANT_CLASSES[variant],
        SHAPE_CLASSES[shape],
        className
      )}
      {...props}
    />
  );
});

export default Button;
