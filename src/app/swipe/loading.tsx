import Navbar from "@/components/Navbar";
import { ProfileCardSkeleton, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <main className="flex h-screen flex-col p-4 pb-24 md:ml-56 md:pb-6">
        <div className="mx-auto flex h-full w-full max-w-md flex-col">
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <ProfileCardSkeleton />
        </div>
      </main>
      <Navbar />
    </>
  );
}
