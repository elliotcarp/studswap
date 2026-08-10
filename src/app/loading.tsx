// Root-level fallback: shown while a page's server component is still
// fetching data with no more specific loading.tsx of its own (e.g. the
// landing page). Mirrors the landing header + hero shape with shimmer
// skeleton blocks, consistent with the rest of the app's loading states,
// rather than a plain spinner.

import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16">
        <Skeleton className="h-12 w-full max-w-2xl" />
        <Skeleton className="h-12 w-full max-w-xl" />
        <Skeleton className="mt-4 h-5 w-full max-w-md" />
        <Skeleton className="mt-4 h-12 w-full max-w-xs rounded-full" />
      </div>
    </div>
  );
}
