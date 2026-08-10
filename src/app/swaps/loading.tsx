import Navbar from "@/components/Navbar";
import { Skeleton, SwapCardSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <main className="flex flex-col p-6 pb-24 md:ml-56 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <Skeleton className="mb-1 h-7 w-40" />
          <Skeleton className="mb-4 h-4 w-64" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SwapCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
      <Navbar />
    </>
  );
}
