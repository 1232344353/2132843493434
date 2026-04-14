import { Skeleton } from "@/components/ui/skeleton";

export default function EventLoading() {
  return (
    <div className="min-h-screen dashboard-page">
      <div className="mx-auto max-w-6xl px-4 pt-32 space-y-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3.5 w-32 mt-1" />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          ))}
        </div>

        {/* Action tabs */}
        <div className="flex gap-2">
          {[80, 72, 64].map((w, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" style={{ width: w }} />
          ))}
        </div>

        {/* Content area */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.01] px-4 py-3">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 flex-1 max-w-[12rem]" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
