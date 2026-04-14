import { Skeleton } from "@/components/ui/skeleton";

export default function TeamDetailLoading() {
  return (
    <div className="min-h-screen dashboard-page">
      <div className="mx-auto max-w-4xl px-4 pt-32 space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3 w-28 mt-1" />
      </div>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* EPA stats */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-center space-y-2"
              >
                <Skeleton className="mx-auto h-2.5 w-14" />
                <Skeleton className="mx-auto h-7 w-12" />
                <Skeleton className="mx-auto h-2 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Scouting summary */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <Skeleton className="h-4 w-36" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.05] p-3 text-center space-y-2"
                style={{ background: "rgba(59,130,246,0.05)" }}
              >
                <Skeleton className="mx-auto h-2.5 w-16" />
                <Skeleton className="mx-auto h-6 w-10" />
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-5 lg:grid-cols-2">
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

        {/* Match history */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2.5 w-44" />
          </div>
          <div className="divide-y divide-white/[0.04]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
                <div className="flex items-center gap-3">
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
