"use client";

// Shared text input/textarea primitive. Previously every text input in the
// app (CityPicker, PromptsEditor, ProfileView's inline editors) used a
// plain gray border with a gray focus ring — the only inputs with any
// brand color at all were ChipSelect's chips. This gives every input the
// same brand-colored focus state instead of that being one-off per screen.

import { forwardRef } from "react";
import clsx from "clsx";

const BASE_CLASSES =
  "w-full rounded-xl border border-carbon-line bg-white px-4 py-3 text-base text-chalk placeholder:text-carbon transition-colors focus:border-riviera focus:outline-none focus:ring-2 focus:ring-riviera/30 disabled:bg-gray-50 disabled:text-carbon";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={clsx(BASE_CLASSES, className)} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={clsx(BASE_CLASSES, className)} {...props} />;
  }
);
