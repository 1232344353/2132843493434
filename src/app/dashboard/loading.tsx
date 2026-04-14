import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen dashboard-page">
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-10">

        {/* Greeting box */}
        <div className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 space-y-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-2.5 w-64" />
        </div>

        {/* Pinned event hero */}
        <div
          className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          style={{ minHeight: 200 }}
        >
          <div className="flex gap-2 mb-5">
            <Skeleton className="h-5 w-[4.5rem] rounded-full" />
            <Skeleton className="h-5 w-[5.5rem] rounded-full" />
          </div>
          <Skeleton className="h-7 w-64 mb-3" />
          <Skeleton className="h-3 w-48 mb-1.5" />
          <Skeleton className="h-3 w-36 mb-6" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2"
            >
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </div>

        {/* Scouting Reports */}
        <div className="mb-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-44" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
          <div className="flex gap-4 overflow-hidden pb-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="min-w-[240px] max-w-[260px] flex-shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2"
              >
                <Skeleton className="h-2.5 w-36" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-2.5 w-28" />
                <Skeleton className="h-2.5 w-24" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mb-10 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="border-b border-white/[0.05] px-5 py-4 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-52" />
          </div>
          <div className="divide-y divide-white/[0.04]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <Skeleton className="h-3 w-3 rounded-sm" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3 flex-1 max-w-[7rem]" />
                <Skeleton className="h-1.5 w-16 rounded-full" />
                <Skeleton className="h-3 w-5" />
              </div>
            ))}
          </div>
        </div>

        {/* Events grid */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-14 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
