import { Skeleton } from "@/components/ui/skeleton";

export default function ScoutingLoading() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-black/30 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-3 space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Phase indicator */}
        <div className="flex justify-center gap-2">
          {[96, 88, 80].map((w, i) => (
            <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />
          ))}
        </div>

        {/* Phase title */}
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>

        {/* Scout panels */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="scout-panel p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-2.5 w-52" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-8 w-12 rounded-lg" />
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </div>
        ))}

        {/* Submit area */}
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
