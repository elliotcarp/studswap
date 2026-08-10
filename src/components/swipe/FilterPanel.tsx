"use client";

// Filter panel for the swipe screen: destination city, a flexible trip-date
// range (matched against candidates by overlap rather than requiring exact
// dates), and minimum group size. Bottom sheet on mobile, centered modal on
// desktop.

import { useState } from "react";
import CityPicker from "@/components/CityPicker";
import ChipSelect from "@/components/onboarding/ChipSelect";
import { ACCOMMODATES_OPTIONS } from "@/lib/onboardingOptions";
import type { CandidateFilters } from "@/types";

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

  function setField<K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-6">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-gradient-to-br from-riviera-strong via-bloom to-spritz p-6 text-white md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl text-white/70 hover:text-white">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Destination city</span>
            <CityPicker
              value={draft.city}
              onChange={(city) => setField("city", city)}
              placeholder="e.g. Barcelona"
              light
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Trip dates</p>
            <div className="mt-1.5 flex gap-2">
              <div className="flex-1">
                <label htmlFor="filter-trip-from" className="sr-only">
                  Trip from
                </label>
                <input
                  id="filter-trip-from"
                  type="date"
                  value={draft.tripFrom}
                  onChange={(e) => setField("tripFrom", e.target.value)}
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
                  onChange={(e) => setField("tripTo", e.target.value)}
                  className="w-full rounded-xl border-0 bg-white/95 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-overlap" className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Minimum overlap (days)
            </label>
            <p className="text-xs text-white/70">
              A swap only works if your dates and theirs overlap. This is how flexible you are
              rather than requiring an exact match.
            </p>
            <input
              id="filter-overlap"
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.minOverlapDays}
              onChange={(e) => setField("minOverlapDays", e.target.value)}
              className="w-full rounded-xl border-0 bg-white/95 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white sm:w-32"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Minimum group size</span>
            <ChipSelect
              options={ACCOMMODATES_OPTIONS}
              value={draft.minAccommodates}
              onChange={(value) => setField("minAccommodates", value)}
              light
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-1 rounded-full bg-white px-4 py-3 text-sm font-semibold text-riviera-strong shadow"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={() =>
              setDraft({ city: "", tripFrom: "", tripTo: "", minOverlapDays: "0", minAccommodates: "1" })
            }
            className="rounded-full bg-white/15 px-4 py-3 text-sm font-medium text-white"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
