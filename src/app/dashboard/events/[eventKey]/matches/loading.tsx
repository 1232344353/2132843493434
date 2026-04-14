import { Skeleton } from "@/components/ui/skeleton";

export default function MatchesLoading() {
  return (
    <div className="min-h-screen dashboard-page">
      <div className="mx-auto max-w-2xl px-4 pt-32 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-48" />
      </div>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2">
          {[56, 64, 56].map((w, i) => (
            <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
          ))}
        </div>

        <Skeleton className="h-3.5 w-40" />

        {/* Match cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              {/* Red alliance */}
              <div className="flex gap-1">
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    className="skeleton-shimmer h-7 flex-1 rounded"
                    style={{ backgroundColor: "rgba(239,68,68,0.12)" }}
                  />
                ))}
              </div>
              {/* Blue alliance */}
              <div className="flex gap-1">
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    className="skeleton-shimmer h-7 flex-1 rounded"
                    style={{ backgroundColor: "rgba(59,130,246,0.12)" }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
