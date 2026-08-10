"use client";

// Searchable dropdown restricted to EUROPEAN_CITIES: forces selection of a
// canonical city name instead of free text, so "Lisboa"/"Lisbon"/"Lisbonne"
// can't fragment the destination-city filter into variants that never match.

import { useEffect, useMemo, useState } from "react";
import { EUROPEAN_CITIES } from "@/lib/cities";

export default function CityPicker({
  value,
  onChange,
  placeholder,
  light = false,
}: {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  // Inverted style for a colorful/dark background (see FilterPanel):
  // frosted white input instead of the default gray-bordered one, which
  // would otherwise disappear against anything but plain white.
  light?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return EUROPEAN_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  function select(city: string) {
    onChange(city);
    setQuery(city);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (e.target.value !== value) onChange("");
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? "Start typing a city…"}
        className={
          light
            ? "w-full rounded-xl border-0 bg-white/95 px-4 py-3 text-lg text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
            : "w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
        }
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {matches.map((city) => (
            <li key={city}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(city)}
                className="block w-full px-4 py-2 text-left text-base hover:bg-gray-50"
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && matches.length === 0 && !EUROPEAN_CITIES.includes(query) && (
        <p className={`mt-1 text-xs ${light ? "text-white/70" : "text-gray-400"}`}>
          No matching city. Pick one from the list.
        </p>
      )}
    </div>
  );
}
