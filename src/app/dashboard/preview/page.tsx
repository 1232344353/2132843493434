/**
 * TEMPORARY PREVIEW PAGE — delete before shipping.
 * Shows the sidebar layout and new event-pinning design without login.
 */

import { PinnedEventHero } from "../pinned-event-hero";

export default function PreviewPage() {
  const mockEvent = {
    name: "Sacramento Regional",
    year: 2025,
    location: "Sacramento, CA",
    start_date: "2025-03-20",
    end_date: "2025-03-22",
    tba_key: "2025sacra",
    status: "live" as const,
    is_attending: true,
  };

  const mockEvents = [
    { id: "1", name: "Sacramento Regional", year: 2025, location: "Sacramento, CA", start: "Mar 20", end: "Mar 22", status: "live", is_pinned: true, is_attending: true },
    { id: "2", name: "Los Angeles Regional", year: 2025, location: "Los Angeles, CA", start: "Apr 3", end: "Apr 5", status: "upcoming", is_pinned: false, is_attending: false },
    { id: "3", name: "Silicon Valley Regional", year: 2024, location: "San Jose, CA", start: "Mar 8", end: "Mar 10", status: "past", is_pinned: false, is_attending: true },
  ];

  const mockReports = [
    { team: 254, event: "2025 Sacramento Regional", match: "Qual 12", scouter: "J. Kim", date: "2h ago" },
    { team: 1678, event: "2025 Sacramento Regional", match: "Qual 11", scouter: "A. Park", date: "3h ago" },
    { team: 971, event: "2025 Sacramento Regional", match: "Qual 10", scouter: "M. Chen", date: "5h ago" },
  ];

  return (
    <div className="min-h-screen dashboard-page">
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-10">

        {/* Greeting box */}
        <div className="mb-6 relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-48 rounded-full bg-teal-500/[0.07] blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Team 1678</p>
            <h1 className="mt-1 text-xl font-bold text-white">Welcome back, Alex.</h1>
            <p className="mt-0.5 text-sm text-gray-400">Sync events and keep scouting data flowing for the next match.</p>
          </div>
        </div>

        {/* Pinned Event Hero */}
        <div className="mb-6">
          <PinnedEventHero
            event={mockEvent}
            isAttending={mockEvent.is_attending}
            status={mockEvent.status}
          />
        </div>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {[
            { label: "Synced", value: 3 },
            { label: "Members", value: 12 },
            { label: "Entries", value: 148 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/10"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{stat.label}</p>
              <p className="mt-1.5 text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Scouting Reports */}
        <div className="mb-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Scouting Reports</h3>
              <p className="text-xs text-gray-400">Latest entries from your team</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/5">
              View all
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 pt-1 -mx-1 px-1">
            {mockReports.map((r) => (
              <div
                key={r.team}
                className="min-w-[260px] max-w-[280px] flex-shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/10"
              >
                <p className="truncate text-xs font-medium text-gray-500">{r.event}</p>
                <h4 className="text-base font-semibold text-white">Team {r.team}</h4>
                <p className="text-xs text-gray-500">{r.match} · {r.date}</p>
                <p className="mt-2 text-xs text-gray-500">Scouted by {r.scouter}</p>
                <div className="mt-3 flex gap-2">
                  <button className="flex items-center gap-1 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-300 transition hover:bg-teal-500/15">
                    Review
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <button className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-gray-400 transition hover:border-white/20 hover:text-gray-200">
                    Event
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mb-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="border-b border-white/[0.05] px-5 py-4">
            <h3 className="text-sm font-semibold text-white">Scout Leaderboard</h3>
            <p className="text-xs text-gray-400">Total entries submitted this season</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {[
              { name: "Alex Kim", count: 48 },
              { name: "Jordan Park", count: 41 },
              { name: "Sam Rivera", count: 35 },
              { name: "Morgan Chen", count: 24 },
            ].map((scout, i) => (
              <div key={scout.name} className="flex items-center gap-4 px-5 py-3">
                <span className={`w-5 text-center text-xs font-bold tabular-nums ${
                  i === 0 ? "text-amber-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-700" : "text-gray-600"
                }`}>{i + 1}</span>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-bold text-gray-300">
                  {scout.name.charAt(0)}
                </div>
                <p className="flex-1 text-sm font-medium text-white">{scout.name}</p>
                <div className="flex items-center gap-2">
                  <div className="h-1 rounded-full bg-teal-400" style={{ width: `${Math.round((scout.count / 48) * 64)}px` }} />
                  <span className="w-8 text-right text-xs font-bold tabular-nums text-teal-400">{scout.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Events page preview ── */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Your Events</h3>
            <p className="text-xs text-gray-400">Pin one to feature it on your dashboard</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mockEvents.map((ev) => (
              <div
                key={ev.id}
                className={`group relative flex flex-col rounded-2xl border transition-all duration-200 ${
                  ev.is_pinned
                    ? "border-teal-500/30 bg-teal-500/[0.04] shadow-[0_0_0_1px_rgba(52,211,153,0.08)]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.035]"
                }`}
              >
                {ev.status === "live" && (
                  <div className="h-0.5 w-full rounded-t-2xl bg-gradient-to-r from-teal-400 to-emerald-400" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
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
                    {/* Pin button */}
                    <button
                      type="button"
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 ${
                        ev.is_pinned
                          ? "border-teal-500/40 bg-teal-500/10 text-teal-400"
                          : "border-white/10 text-gray-500 hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-400"
                      }`}
                      title={ev.is_pinned ? "Unpin from dashboard" : "Pin to dashboard"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill={ev.is_pinned ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" x2="12" y1="17" y2="22" />
                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-base font-semibold leading-snug text-white">
                      {ev.year} {ev.name}
                    </h3>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {ev.location}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {ev.start} – {ev.end}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.05] pt-4">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${
                      ev.is_attending ? "text-emerald-400" : "text-gray-500"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${ev.is_attending ? "bg-emerald-400" : "bg-gray-600"}`} />
                      {ev.is_attending ? "Attending" : "Not attending"}
                    </span>
                    <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-300">
                      Open
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
