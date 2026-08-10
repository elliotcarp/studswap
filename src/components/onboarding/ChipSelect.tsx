"use client";

// Single-select row of pill chips, Hinge-style (e.g. "How tall are you?", "Do you smoke?").

export default function ChipSelect({
  options,
  value,
  onChange,
  light = false,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  // Inverted style for a colorful/dark background (see FilterPanel).
  light?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              selected
                ? light
                  ? "border-white bg-white text-riviera-strong"
                  : "border-riviera bg-riviera text-white"
                : light
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-gray-300 text-gray-700"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
