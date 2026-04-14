interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Base shimmer block. Use className to set size and border-radius. */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-md ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Stat-card skeleton: label + big number + sub-label. */
export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5"
      aria-hidden="true"
    >
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-2.5 w-[4.5rem]" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-7 w-10 mb-2" />
      <Skeleton className="h-2.5 w-24" />
    </div>
  );
}

/** List-row skeleton: avatar + two text lines + action button. */
export function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4"
      aria-hidden="true"
    >
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-2.5 w-52" />
      </div>
      <Skeleton className="h-7 w-16 rounded-lg" />
    </div>
  );
}

/** Bar-chart skeleton. */
export function SkeletonChart() {
  const heights = [26, 48, 34, 62, 40, 74, 55, 68, 37, 80, 52, 44, 70, 58, 32];
  return (
    <div
      className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5"
      aria-hidden="true"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-5 w-10 rounded-lg" />
      </div>
      <div className="flex items-end gap-1 h-32">
        {heights.map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Full-dashboard skeleton that mirrors the real dashboard layout:
 * greeting box, pinned-event hero, stats row, reports strip, leaderboard.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {/* Greeting box */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] px-5 py-4 space-y-2">
        <Skeleton className="h-2.5 w-14" />
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-2.5 w-64" />
      </div>

      {/* Pinned-event hero */}
      <div
        className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6"
        style={{ minHeight: 184 }}
      >
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-7 w-56 mb-2.5" />
        <Skeleton className="h-3 w-48 mb-1.5" />
        <Skeleton className="h-3 w-36 mb-5" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 space-y-2"
          >
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-6 w-8" />
          </div>
        ))}
      </div>

      {/* Reports horizontal strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-40" />
          </div>
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="min-w-[220px] flex-shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 space-y-2"
            >
              <Skeleton className="h-2.5 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-2.5 w-28" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-48" />
        </div>
        <div className="divide-y divide-white/[0.04]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-3 w-3 rounded-sm" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 flex-1 max-w-[6rem]" />
              <Skeleton className="h-1.5 w-16 rounded-full" />
              <Skeleton className="h-3 w-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
