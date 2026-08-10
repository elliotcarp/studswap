import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex h-screen justify-center bg-gray-50">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white md:shadow-sm">
        <header className="flex items-center gap-3 border-b p-4">
          <span className="text-xl text-gray-300">←</span>
          <Skeleton className="h-5 w-32" />
        </header>
        <div className="flex border-b">
          <div className="flex-1 py-2.5" />
          <div className="flex-1 py-2.5" />
        </div>
        <div className="flex-1 space-y-3 overflow-hidden p-4">
          <Skeleton className="ml-auto h-8 w-2/5 rounded-2xl" />
          <Skeleton className="h-8 w-1/2 rounded-2xl" />
          <Skeleton className="ml-auto h-8 w-1/3 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
