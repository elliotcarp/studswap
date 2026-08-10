import Navbar from "@/components/Navbar";
import { FieldRowSkeleton, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <main className="flex flex-col p-6 pb-24 md:ml-56 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <Skeleton className="mb-4 h-7 w-32" />
          <Skeleton className="mb-6 h-11 w-full rounded-xl" />
          <Skeleton className="mb-6 h-10 w-full rounded-lg" />
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <FieldRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
      <Navbar />
    </>
  );
}
