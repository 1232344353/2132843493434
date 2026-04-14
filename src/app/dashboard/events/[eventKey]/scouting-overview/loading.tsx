import { Skeleton } from "@/components/ui/skeleton";

export default function ScoutingOverviewLoading() {
  return (
    <div className="min-h-screen dashboard-page">
      <main className="mx-auto max-w-4xl space-y-5 px-6 pb-12 pt-10">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-2.5 w-52" />
          </div>
          <Skeleton className="h-9 w-44 rounded-lg" />
        </div>

        {/* Search row */}
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Team section skeletons */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-14 rounded" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
