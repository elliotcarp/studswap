// The three ways a match can play out, as a small pill: "Match" (mutual),
// "You liked" (you're the one paying to stay at their place), "Liked you"
// (they're paying to stay at yours). Shared between the Matches list and
// the chat header so the same match reads the same way everywhere.
export default function MatchStatusPill({
  matchType,
  isPayer,
}: {
  matchType: "MUTUAL" | "PAID";
  isPayer: boolean | null;
}) {
  if (matchType === "MUTUAL") {
    return (
      <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-gradient-to-r from-bloom to-riviera px-2.5 py-1 text-xs font-semibold text-white">
        Match
      </span>
    );
  }
  if (isPayer) {
    return (
      <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-spritz/15 px-2.5 py-1 text-xs font-semibold text-spritz-text">
        You liked
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-riviera/15 px-2.5 py-1 text-xs font-semibold text-riviera-strong">
      Liked you
    </span>
  );
}
