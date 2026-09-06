"use client";

// Multi-select row of pill chips — same look as ChipSelect, but toggles
// membership in a list instead of picking one value (e.g. amenities).

export default function MultiChipSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              selected ? "border-riviera bg-riviera text-white" : "border-gray-300 text-gray-700"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
