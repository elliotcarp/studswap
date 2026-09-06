// Hinge-style scrollable profile: photos and prompt answers interleaved in a
// single scrollable card (vertical scroll to read more, horizontal drag on
// the outer card to swipe, see SwipeCardStack). The header is a fixed
// "ticket-stub" data strip: city, dates, flat type, and price/day are always
// visible above the fold, since those are the four things that actually
// decide a swipe.

import type { ProfileCardData, RatingSummary } from "@/types";
import Surface from "@/components/ui/Surface";
import { ImageIcon } from "@/components/icons";
import { LONG_STAY_THRESHOLD_DAYS } from "@/lib/pricing";

// Bare "Sep 1 to Aug 5" reads as an invalid end-before-start range without a
// year to show it actually spans two years — show the year whenever the
// range crosses a calendar year boundary, or whenever the stay is long
// enough (see LONG_STAY_THRESHOLD_DAYS) that a reader might otherwise assume
// it's within the current year by default.
function formatDateRange(fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const stayDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  const showYear = from.getFullYear() !== to.getFullYear() || stayDays >= LONG_STAY_THRESHOLD_DAYS;

  const opts: Intl.DateTimeFormatOptions = showYear
    ? { month: "short", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric" };
  return `${from.toLocaleDateString("en-US", opts)} to ${to.toLocaleDateString("en-US", opts)}`;
}

// See AMENITY_OPTIONS in onboardingOptions.ts, the source of truth for the
// set — this is purely cosmetic, an unmapped amenity just falls back to a
// bullet (see the "•" default where this is used).
const AMENITY_ICONS: Record<string, string> = {
  Wifi: "📶",
  "Washing machine": "🧺",
  Dishwasher: "🍽️",
  "Air conditioning": "❄️",
  Heating: "🔥",
  Workspace: "💻",
  TV: "📺",
  Parking: "🅿️",
  Elevator: "🛗",
  Balcony: "🌇",
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
      {children}
    </span>
  );
}

// The eye-catching treatment for the handful of badges that most directly
// decide a swipe (year of study, room type, arrangement preference) —
// everything else stays the plain gray Badge above.
function GradientPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gradient-to-r from-riviera/15 to-bloom/15 px-3 py-1 text-xs font-semibold text-riviera-strong">
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

// Rendered in the first photo slot when neither flat nor self photos have
// been added yet, instead of an external placehold.co image, so this never
// depends on a third-party host and always matches the app's own look.
function NoPhotoPlaceholder({ badge }: { badge?: React.ReactNode }) {
  return (
    // No w-full here: this div already has mx-3 (margin), and `width: 100%`
    // plus margin on the SAME element overflows the parent by the margin
    // amount (percentage widths don't subtract margins the way `auto` does)
    // — that overflow was getting clipped by the outer card's rounded
    // border, cutting the box's right edge off flush against it instead of
    // leaving the same gap the left edge has. Photo's wrapper div avoids
    // this by putting w-full on the inner <img> instead, whose parent (this
    // same kind of margined div) is what should stay auto-width.
    <div className="relative mx-3 my-3 flex h-40 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl bg-gradient-to-br from-riviera/20 to-bloom/20 text-riviera shadow-md">
      <ImageIcon className="h-8 w-8" strokeWidth={1.5} />
      <span className="text-sm font-medium">No photos yet</span>
      {badge}
    </div>
  );
}

function FlatVideo({ url }: { url: string }) {
  return (
    <div className="mx-3 my-3 overflow-hidden rounded-2xl bg-black shadow-md">
      <video src={url} controls playsInline className="aspect-video w-full" />
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
    <Surface variant="tinted" className="mx-3 mt-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">
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
    </Surface>
  );
}

function PromptCard({ question, answer }: { question: string; answer: string }) {
  return (
    <Surface className="mx-3 my-3 p-4">
      <p className="text-sm font-semibold text-bloom-text">{question}</p>
      <p className="mt-1 text-lg">{answer}</p>
    </Surface>
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
  // flatPhotoUrls first: the flat's cover photo leads the scroll (this is a
  // flat-swap platform, so what leads the card is the place, not the
  // person), then selfPhotoUrls. See PhotoGridEditor's "Cover photo" /
  // "Profile picture" labels, which mark exactly these two slots.
  const allPhotos = [...profile.flatPhotoUrls, ...profile.selfPhotoUrls];
  const [firstPhoto, secondPhoto, thirdPhoto, ...restPhotos] = allPhotos;
  const [prompt1, prompt2, prompt3, ...restPrompts] = profile.prompts;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-card bg-gradient-to-br from-riviera via-bloom to-spritz p-[2px] shadow-elevated [contain:paint]">
      <div className="scrollbar-hide h-full overflow-y-auto rounded-card bg-gray-100">
        {firstPhoto ? (
          <Photo
            url={firstPhoto}
            badge={ratingDisplay === "compact" ? <RatingCompactBadge ratingSummary={profile.ratingSummary} /> : undefined}
          />
        ) : (
          <NoPhotoPlaceholder
            badge={ratingDisplay === "compact" ? <RatingCompactBadge ratingSummary={profile.ratingSummary} /> : undefined}
          />
        )}

        {/* Ticket-stub data strip: the four things that decide a swipe,
            always visible, never buried in the badge row below. */}
        <Surface variant="elevated" className="mx-3 -mt-1">
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
                {profile.neighbourhood && (
                  <span className="ml-1 font-sans text-sm font-medium text-riviera">· {profile.neighbourhood}</span>
                )}
              </h2>
              <span className="flex-shrink-0 text-sm text-gray-500">
                {profile.name}, {profile.age}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-gray-200 pt-2 font-mono text-xs text-gray-600">
              <span>{formatDateRange(profile.availableFrom, profile.availableTo)}</span>
              <span>Fits {profile.accommodates}</span>
              <span className="text-right">
                <span className="block text-sm font-bold text-spritz-text">
                  €{(Number(profile.pricePerDayCents) / 100).toFixed(0)}/day
                </span>
                {profile.pricePerMonthCents && (
                  <span className="block text-[11px] text-gray-400">
                    €{(Number(profile.pricePerMonthCents) / 100).toFixed(0)}/month
                  </span>
                )}
                {priceCaption(profile.arrangementPreference) && (
                  <span className="block text-[11px] text-gray-400">{priceCaption(profile.arrangementPreference)}</span>
                )}
              </span>
            </div>
          </div>
        </Surface>

        {/* The central "is this worth swiping right on" question: date fit
            and swap-vs-paid compatibility, computed against the viewer's own
            profile (see /api/profile GET) — undefined outside discovery
            (match chat, profile preview), where there's no "viewer" to be
            relative to. */}
        {(profile.overlapWithViewerDays !== undefined || profile.mutualSwapPossible !== undefined) && (
          <div className="mx-3 mt-2 rounded-xl bg-gradient-to-r from-bloom/15 to-riviera/15 px-3 py-2 text-center text-xs font-semibold text-riviera-strong">
            {compatibilityLine(profile.overlapWithViewerDays, profile.mutualSwapPossible)}
          </div>
        )}

        {ratingDisplay === "full" && <RatingStatsBlock ratingSummary={profile.ratingSummary} />}

        <div className="p-4 pb-0">
          <p className="text-sm text-gray-500">
            {profile.program} · {profile.university}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <GradientPill>{profile.yearOfStudy}</GradientPill>
            {profile.roomType && <GradientPill>{profile.roomType}</GradientPill>}
            {profile.arrangementPreference && <GradientPill>🔁 {profile.arrangementPreference}</GradientPill>}
          </div>
          {profile.amenities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.amenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm"
                >
                  <span aria-hidden>{AMENITY_ICONS[a] ?? "•"}</span>
                  {a}
                </span>
              ))}
            </div>
          )}
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
          <Surface className="mx-3 my-3 p-4">
            <p className="text-sm font-semibold text-riviera">About the flat</p>
            <p className="mt-1 whitespace-pre-wrap text-base">{profile.flatDescription}</p>
          </Surface>
        )}

        {profile.flatVideoUrl && <FlatVideo url={profile.flatVideoUrl} />}

        {showAddress && profile.address && (
          <Surface variant="tinted" className="mx-3 my-3 p-4">
            <p className="text-sm font-semibold text-riviera-strong">📍 Exact address</p>
            <p className="mt-1 text-base">{profile.address}</p>
          </Surface>
        )}

        {restPhotos.map((url) => (
          <Photo key={url} url={url} />
        ))}

        {(profile.smoker || profile.pets) && (
          <div className="p-4 pb-24 pt-2">
            <div className="flex flex-wrap gap-2">
              {profile.smoker && <Badge>🚬 {profile.smoker}</Badge>}
              {profile.pets && <Badge>🐾 {profile.pets}</Badge>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Deferred to the post-onboarding checklist (see OnboardingWizard.tsx), so
// unset ("Either"'s default aside) is a real, common state — no caption
// rather than a misleading one.
function priceCaption(arrangementPreference: string): string | null {
  if (arrangementPreference === "Mutual swap only") return "swap fairness calc";
  if (arrangementPreference === "Paid stay only") return "to book directly";
  return null;
}

// See ProfileCardData.overlapWithViewerDays/mutualSwapPossible — both are
// computed server-side, relative to the viewer's own profile.
function compatibilityLine(overlapDays: number | null | undefined, mutualSwapPossible: boolean | undefined): string {
  const parts: string[] = [];
  if (overlapDays != null) parts.push(`${overlapDays}-day overlap with your dates`);
  if (mutualSwapPossible !== undefined) parts.push(mutualSwapPossible ? "Mutual swap possible" : "Paid stay only");
  return parts.length > 0 ? parts.join(" · ") : "Complete your own profile to see compatibility";
}
