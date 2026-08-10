// Shared loading placeholders. All built on the same shimmer fill
// (.animate-skeleton, see globals.css) so every loading state in the app
// reads as one system instead of each page inventing its own "Loading…"
// text or spinner.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-skeleton rounded-lg ${className}`} />;
}

// Stands in for SwipeCardStack's top card (see ProfileCard) while the first
// batch of profiles is loading, so the swipe page doesn't jump from an empty
// center-of-screen spinner into a full-height card.
export function ProfileCardSkeleton() {
  return (
    <div className="relative flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-white via-white/80 to-transparent p-5 pt-12">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

// One row of the matches/liked lists (avatar + two text lines).
export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="h-14 w-14 flex-shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

// Stands in for one confirmed-swap card on /swaps (avatar/details row on top,
// solid "Validated" block below).
export function SwapCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200">
      <div className="flex gap-3 p-4">
        <Skeleton className="h-14 w-14 flex-shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>
      <div className="flex items-center gap-3 bg-gray-100 p-4">
        <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}

// Stands in for a couple of profile-field rows on /profile.
export function FieldRowSkeleton() {
  return (
    <div className="flex flex-col gap-2 border-b border-gray-100 py-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
