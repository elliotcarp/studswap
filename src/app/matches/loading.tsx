import Navbar from "@/components/Navbar";
import { ListSkeleton, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <main className="flex flex-col p-6 pb-24 md:ml-56 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <Skeleton className="mb-4 h-8 w-40" />
          <ListSkeleton />
        </div>
      </main>
      <Navbar />
    </>
  );
}
