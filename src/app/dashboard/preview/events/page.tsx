/**
 * TEMPORARY PREVIEW PAGE — delete before shipping.
 * Renders the events page layout without auth.
 */

const mockEvents = [
  {
    id: "1",
    tba_key: "2025sacra",
    name: "Sacramento Regional",
    year: 2026,
    location: "Sacramento, CA",
    start_date: "2026-03-18",
    end_date: "2026-03-21",
    status: "live" as const,
    is_pinned: true,
    is_attending: true,
    synced_by: "Alex Chen",
  },
  {
    id: "2",
    tba_key: "2026hiho",
    name: "Hawaii Regional",
    year: 2026,
    location: "Honolulu, HI, USA",
    start_date: "2026-04-14",
    end_date: "2026-04-16",
    status: "upcoming" as const,
    is_pinned: false,
    is_attending: true,
    synced_by: "Alex Chen",
  },
  {
    id: "3",
    tba_key: "2026lake",
    name: "Lakeview Regional",
    year: 2026,
    location: "Chicago, IL",
    start_date: "2026-04-28",
    end_date: "2026-04-30",
    status: "future" as const,
    is_pinned: false,
    is_attending: false,
    synced_by: "Jordan Wu",
  },
  {
    id: "4",
    tba_key: "2025lake",
    name: "Lakeview Regional",
    year: 2025,
    location: "Chicago, IL",
    start_date: "2025-03-06",
    end_date: "2025-03-08",
    status: "past" as const,
    is_pinned: false,
    is_attending: true,
    synced_by: null,
  },
  {
    id: "5",
    tba_key: "2025hiho",
    name: "Hawaii Regional",
    year: 2025,
    location: "Honolulu, HI, USA",
    start_date: "2025-03-19",
    end_date: "2025-03-22",
    status: "past" as const,
    is_pinned: false,
    is_attending: false,
    synced_by: null,
  },
];

function formatDateShort(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EventsPreviewPage() {
  return (
    <div className="min-h-screen dashboard-page">
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
            Competition Season
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Events</h1>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium tabular-nums text-gray-400">
              {mockEvents.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Sync events from The Blue Alliance and pin one to your dashboard.
          </p>
        </div>

        {/* Sync form (captain view) */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.015]">
          <div className="border-b border-white/[0.05] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Sync a New Event</h2>
                <p className="text-xs text-gray-500">Pull in event data from The Blue Alliance</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="TBA event key (e.g. 2025hiho)"
                  disabled
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-gray-600"
                />
                <button
                  disabled
                  className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white opacity-60"
                >
                  Sync Event
                </button>
              </div>
              <p className="mt-2 text-[11px] text-gray-600">
                Find the key after <span className="font-mono">/event/</span> in the TBA URL, e.g.{" "}
                <span className="font-mono">2025hiho</span>
              </p>
            </div>
          </div>
        </div>

        {/* Events grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mockEvents.map((ev) => {
            const dateRange = `${formatDateShort(ev.start_date)} – ${formatDateShort(ev.end_date)}`;

            return (
              <div
                key={ev.id}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${
                  ev.is_pinned
                    ? "border-teal-500/25 bg-teal-500/[0.035]"
                    : ev.status === "live"
                    ? "border-teal-500/20 bg-teal-500/[0.025]"
                    : ev.status === "upcoming"
                    ? "border-amber-500/15 bg-amber-500/[0.02]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
                }`}
              >
                {/* Status accent line */}
                <div className={`h-px w-full ${
                  ev.status === "live"
                    ? "bg-gradient-to-r from-transparent via-teal-400/70 to-transparent"
                    : ev.status === "upcoming"
                    ? "bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
                    : ev.is_pinned
                    ? "bg-gradient-to-r from-transparent via-teal-500/40 to-transparent"
                    : "bg-white/[0.04]"
                }`} />

                <div className="flex flex-1 flex-col p-5">
                  {/* Status badges + pin button */}
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {ev.status === "live" && (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                          Live
                        </span>
                      )}
                      {ev.status === "upcoming" && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/20">
                          Soon
                        </span>
                      )}
                      {ev.status === "future" && (
                        <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-sky-400 ring-1 ring-sky-500/15">
                          Coming
                        </span>
                      )}
                      {ev.status === "past" && (
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 ring-1 ring-white/10">
                          Past
                        </span>
                      )}
                      {ev.is_pinned && (
                        <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-400 ring-1 ring-teal-500/20">
                          Pinned
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                        ev.is_pinned
                          ? "border-teal-500/40 bg-teal-500/10 text-teal-400"
                          : "border-white/10 text-gray-600 hover:border-teal-500/30 hover:text-teal-400"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill={ev.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" x2="12" y1="17" y2="22" />
                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                      </svg>
                    </button>
                  </div>

                  {/* Event info */}
                  <div className="flex-1">
                    {ev.year && (
                      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                        {ev.year}
                      </p>
                    )}
                    <h3 className="text-[15px] font-semibold leading-snug text-white transition-colors group-hover:text-teal-200">
                      {ev.name}
                    </h3>
                    <div className="mt-3 space-y-1.5">
                      <p className="flex items-center gap-1.5 text-xs text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {ev.location}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {dateRange}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 space-y-2.5 border-t border-white/[0.05] pt-3.5">
                    <div className="flex items-center justify-between gap-2">
                      {ev.is_attending ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Attending
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                          Not attending
                        </span>
                      )}
                      <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-300">
                        Open
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                    {ev.synced_by && (
                      <p className="text-[11px] text-gray-600">
                        Synced by {ev.synced_by}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
