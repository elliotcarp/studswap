import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <main className="flex flex-col p-6 pb-24 md:ml-56 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <ul className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                <Skeleton className="h-16 w-16 flex-shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
                <div className="flex flex-shrink-0 flex-col gap-1.5">
                  <Skeleton className="h-7 w-20 rounded-lg" />
                  <Skeleton className="h-7 w-20 rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Navbar />
    </>
  );
}
