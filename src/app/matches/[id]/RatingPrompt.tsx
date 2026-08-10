"use client";

// Post-swap rating form, surfaced in TripDetails once a swap's lifecycle has
// been processed (see swapLifecycle.ts) and the current user hasn't
// submitted yet. Blind: the other side's values only ever come back from
// GET /api/matches/[id]/ratings once both have submitted or the window has
// closed — this component never has to reason about that itself.

import { useEffect, useState } from "react";

interface RatingPayload {
  overall: number;
  flatMatchedListing: boolean;
  communication: number;
  wouldSwapAgain: boolean;
}

interface RatingState {
  canRate: boolean;
  myRating: RatingPayload | null;
  theirRating: RatingPayload | null;
  waitingOnOther: boolean;
}

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={`text-lg leading-none ${n <= value ? "text-spritz" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-lg px-3 py-1 text-xs font-medium ${
            value === true ? "bg-riviera text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-lg px-3 py-1 text-xs font-medium ${
            value === false ? "bg-riviera text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function RatingPrompt({ matchId, otherUserName }: { matchId: string; otherUserName: string }) {
  const [state, setState] = useState<RatingState | null>(null);
  const [overall, setOverall] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [flatMatchedListing, setFlatMatchedListing] = useState<boolean | null>(null);
  const [wouldSwapAgain, setWouldSwapAgain] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/matches/${matchId}/ratings`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: RatingState) => setState(data))
      .catch(() => {
        // Best-effort: the chat still works even if this panel fails to load.
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function submit() {
    if (flatMatchedListing == null || wouldSwapAgain == null) {
      setError("Answer both yes/no questions before submitting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overall, communication, flatMatchedListing, wouldSwapAgain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not submit your rating.");
        return;
      }
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  if (state.myRating) {
    return (
      <div className="border-b bg-riviera/5 p-4 text-sm">
        <p className="font-medium text-riviera-strong">You rated this swap</p>
        {state.theirRating ? (
          <p className="mt-1 text-gray-600">
            {otherUserName} rated it ★{state.theirRating.overall}
            {state.theirRating.wouldSwapAgain ? " and would swap with you again." : "."}
          </p>
        ) : (
          <p className="mt-1 text-gray-500">
            {otherUserName}&apos;s rating will show here once they submit theirs, or once the rating window
            closes.
          </p>
        )}
      </div>
    );
  }

  if (!state.canRate) return null;

  return (
    <div className="border-b bg-riviera/5 p-4 text-sm">
      <p className="mb-2 font-medium text-riviera-strong">How was your swap with {otherUserName}?</p>

      <StarPicker label="Overall" value={overall} onChange={setOverall} />
      <StarPicker label="Communication" value={communication} onChange={setCommunication} />
      <YesNoRow label="Was the flat as described?" value={flatMatchedListing} onChange={setFlatMatchedListing} />
      <YesNoRow label="Would you swap with them again?" value={wouldSwapAgain} onChange={setWouldSwapAgain} />

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-3 rounded-lg bg-riviera px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        Submit rating
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
