// Hinge-style scrollable profile: photos and prompt answers interleaved in a
// single scrollable card (vertical scroll to read more, horizontal drag on
// the outer card to swipe, see SwipeCardStack). The header is a fixed
// "ticket-stub" data strip: city, dates, flat type, and price/day are always
// visible above the fold, since those are the four things that actually
// decide a swipe.

import type { ProfileCardData, RatingSummary } from "@/types";

function formatDateRange(fromIso: string, toIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const from = new Date(fromIso).toLocaleDateString("en-US", opts);
  const to = new Date(toIso).toLocaleDateString("en-US", opts);
  return `${from} to ${to}`;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
      {children}
    </span>
  );
}

function Photo({ url, badge }: { url: string; badge?: React.ReactNode }) {
  return (
    <div className="relative mx-3 my-3 overflow-hidden rounded-2xl shadow-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        draggable={false}
        className="aspect-[4/5] w-full select-none object-cover"
      />
      {badge}
    </div>
  );
}

function formatStars(avg: number | null): string {
  return avg != null ? avg.toFixed(1) : "N/A";
}

function formatPct(pct: number | null): string {
  return pct != null ? `${Math.round(pct)}%` : "N/A";
}

// Small corner overlay on the first photo — what the swipe card shows
// (visible during matching, not just after), cold-start-safe: zero
// completed swaps never renders a bare "★0.0", just a neutral pill.
function RatingCompactBadge({ ratingSummary }: { ratingSummary: RatingSummary }) {
  if (ratingSummary.completedSwapCount === 0) {
    return (
      <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-600 shadow">
        New to StudSwap
      </span>
    );
  }
  return (
    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-700 shadow">
      ★ {formatStars(ratingSummary.overallAvg)} · {ratingSummary.completedSwapCount} swap
      {ratingSummary.completedSwapCount === 1 ? "" : "s"}
    </span>
  );
}

// Fuller breakdown for an actual profile view (not the swipe card): all
// dimensions plus the completed-swap count, same cold-start treatment.
function RatingStatsBlock({ ratingSummary }: { ratingSummary: RatingSummary }) {
  if (ratingSummary.completedSwapCount === 0) {
    return (
      <div className="mx-3 mt-3 rounded-2xl bg-gray-100 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-gray-500">New to StudSwap</p>
        <p className="mt-0.5 text-xs text-gray-400">No completed swaps yet</p>
      </div>
    );
  }
  return (
    <div className="mx-3 mt-3 rounded-2xl bg-white p-4 shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-500">
          {ratingSummary.completedSwapCount} completed swap{ratingSummary.completedSwapCount === 1 ? "" : "s"}
        </p>
        <p className="font-mono text-lg font-bold text-spritz-text">★ {formatStars(ratingSummary.overallAvg)}</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-mono text-base font-bold">{formatStars(ratingSummary.communicationAvg)}</p>
          <p className="text-xs text-gray-500">Communication</p>
        </div>
        <div>
          <p className="font-mono text-base font-bold">{formatPct(ratingSummary.flatMatchedPct)}</p>
          <p className="text-xs text-gray-500">Flat matched listing</p>
        </div>
        <div>
          <p className="font-mono text-base font-bold">{formatPct(ratingSummary.wouldAgainPct)}</p>
          <p className="text-xs text-gray-500">Would swap again</p>
        </div>
      </div>
    </div>
  );
}

function PromptCard({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="mx-3 my-3 rounded-2xl bg-white p-4 shadow-md">
      <p className="text-sm font-semibold text-gray-500">{question}</p>
      <p className="mt-1 text-lg">{answer}</p>
    </div>
  );
}

export default function ProfileCard({
  profile,
  showAddress = false,
  ratingDisplay = "compact",
}: {
  profile: ProfileCardData;
  // Off by default on purpose: the exact address should only ever render
  // when this card is shown to the other side of a confirmed match, or to
  // the profile's own owner, never on a public swipe card. Callers opt in
  // explicitly rather than this defaulting to "on".
  showAddress?: boolean;
  // "compact" (default, what the swipe stack gets): a small corner badge on
  // the first photo. "full" (explicit opt-in from actual profile views):
  // a fuller stats block with all rating dimensions.
  ratingDisplay?: "compact" | "full";
}) {
  // selfPhotoUrls first so the profile picture always leads the scroll.
  const allPhotos = [...profile.selfPhotoUrls, ...profile.flatPhotoUrls];
  const photos = allPhotos.length > 0 ? allPhotos : ["https://placehold.co/600x800?text=No+photo"];
  const [firstPhoto, secondPhoto, thirdPhoto, ...restPhotos] = photos;
  const [prompt1, prompt2, prompt3, ...restPrompts] = profile.prompts;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl bg-gray-100 shadow-lg">
      <div className="scrollbar-hide h-full overflow-y-auto">
        <Photo
          url={firstPhoto}
          badge={ratingDisplay === "compact" ? <RatingCompactBadge ratingSummary={profile.ratingSummary} /> : undefined}
        />

        {/* Ticket-stub data strip: the four things that decide a swipe,
            always visible, never buried in the badge row below. */}
        <div className="mx-3 -mt-1 rounded-2xl bg-white shadow-md">
          <div
            aria-hidden
            className="h-3 bg-gray-100"
            style={{
              maskImage:
                "radial-gradient(circle 6px at 12px 0, transparent 6px, black 6.5px)",
              maskRepeat: "repeat-x",
              maskSize: "24px 12px",
              WebkitMaskImage:
                "radial-gradient(circle 6px at 12px 0, transparent 6px, black 6.5px)",
              WebkitMaskRepeat: "repeat-x",
              WebkitMaskSize: "24px 12px",
            }}
          />
          <div className="px-4 pb-3 pt-1">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display truncate text-xl font-bold text-riviera-strong">
                {profile.homeCity}
              </h2>
              <span className="flex-shrink-0 text-sm text-gray-500">
                {profile.name}, {profile.age}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-gray-200 pt-2 font-mono text-xs text-gray-600">
              <span>{formatDateRange(profile.availableFrom, profile.availableTo)}</span>
              <span>Fits {profile.accommodates}</span>
              <span className="text-sm font-bold text-spritz-text">€{(Number(profile.pricePerDayCents) / 100).toFixed(0)}/day</span>
            </div>
          </div>
        </div>

        {ratingDisplay === "full" && <RatingStatsBlock ratingSummary={profile.ratingSummary} />}

        <div className="p-4 pb-0">
          <p className="text-sm text-gray-500">
            {profile.program} · {profile.university}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{profile.yearOfStudy}</Badge>
          </div>
          {profile.selfDescription && (
            <p className="mt-3 whitespace-pre-wrap text-base text-gray-700">{profile.selfDescription}</p>
          )}
        </div>

        {prompt1 && <PromptCard question={prompt1.question} answer={prompt1.answer} />}
        {secondPhoto && <Photo url={secondPhoto} />}
        {prompt2 && <PromptCard question={prompt2.question} answer={prompt2.answer} />}
        {thirdPhoto && <Photo url={thirdPhoto} />}
        {prompt3 && <PromptCard question={prompt3.question} answer={prompt3.answer} />}
        {restPrompts.map((p) => (
          <PromptCard key={p.question} question={p.question} answer={p.answer} />
        ))}

        {profile.flatDescription && (
          <div className="mx-3 my-3 rounded-2xl bg-white p-4 shadow-md">
            <p className="text-sm font-semibold text-gray-500">About the flat</p>
            <p className="mt-1 whitespace-pre-wrap text-base">{profile.flatDescription}</p>
          </div>
        )}

        {showAddress && profile.address && (
          <div className="mx-3 my-3 rounded-2xl bg-riviera/5 p-4">
            <p className="text-sm font-semibold text-riviera-strong">📍 Exact address</p>
            <p className="mt-1 text-base">{profile.address}</p>
          </div>
        )}

        {restPhotos.map((url) => (
          <Photo key={url} url={url} />
        ))}

        <div className="p-4 pb-24 pt-2">
          <div className="flex flex-wrap gap-2">
            <Badge>🚬 {profile.smoker}</Badge>
            <Badge>🐾 {profile.pets}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
