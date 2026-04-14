import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen dashboard-page">
      <div className="mx-auto max-w-5xl px-4 pt-32 space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-56" />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Export bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-7 w-36 rounded-lg" />
          <div className="ml-auto">
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        {/* Team selector + charts */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-6">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
                <Skeleton className="h-[260px] w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        {/* Overview table */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-2.5 w-52" />
          </div>
          {/* Table header */}
          <div className="flex gap-3 border-b border-white/[0.05] px-5 py-3">
            {[48, 80, 72, 72, 72, 72, 56].map((w, i) => (
              <Skeleton key={i} className="h-2.5" style={{ width: w, flexShrink: 0 }} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 border-b border-white/[0.04] px-5 py-3 last:border-b-0"
            >
              {[48, 80, 72, 72, 72, 72, 56].map((w, j) => (
                <Skeleton key={j} className="h-3" style={{ width: w, flexShrink: 0 }} />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
