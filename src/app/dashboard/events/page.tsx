import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SyncEventForm } from "@/app/dashboard/sync-event-form";
import { PinButton } from "./pin-button";
import { PinnedBadge } from "./pinned-badge";

export const metadata: Metadata = {
  title: "Events | PitPilot",
  description: "Manage and sync your FRC competition events.",
};

function parseLocalDate(value: string | null): Date | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateShort(date: string | null) {
  if (!date) return "";
  const d = parseLocalDate(date);
  if (!d) return date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type EventStatus = "live" | "upcoming" | "future" | "past" | null;

function getEventStatus(startDate: string | null, endDate: string | null): EventStatus {
  if (!startDate) return null;
  const now = new Date();
  const start = parseLocalDate(startDate) ?? new Date(startDate);
  const end = endDate ? (parseLocalDate(endDate) ?? new Date(endDate)) : null;

  if (end && now > end) return "past";
  if (now >= start && (!end || now <= end)) return "live";
  const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntil <= 14 ? "upcoming" : "future";
}

const STATUS_ORDER: Record<string, number> = {
  live: 0,
  upcoming: 1,
  future: 2,
  past: 3,
};

export default async function EventsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role, organizations(team_number, name)")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/join");

  const isCaptain = profile.role === "captain";

  const { data: orgEvents } = await supabase
    .from("org_events")
    .select(
      "id, is_attending, is_pinned, created_at, events(id, tba_key, name, location, start_date, end_date, year), profiles(display_name)"
    )
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  const events = orgEvents ?? [];

  // Sort: live → upcoming → future → past; within each group by date
  const sortedEvents = [...events].sort((a, b) => {
    const aEv = a.events;
    const bEv = b.events;
    const aStatus = aEv ? getEventStatus(aEv.start_date, aEv.end_date) : null;
    const bStatus = bEv ? getEventStatus(bEv.start_date, bEv.end_date) : null;
    const aOrder = STATUS_ORDER[aStatus ?? ""] ?? 4;
    const bOrder = STATUS_ORDER[bStatus ?? ""] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aDate = aEv?.start_date ? new Date(aEv.start_date).getTime() : 0;
    const bDate = bEv?.start_date ? new Date(bEv.start_date).getTime() : 0;
    return aStatus === "past" ? bDate - aDate : aDate - bDate;
  });

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
            {events.length > 0 && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium tabular-nums text-gray-400">
                {events.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Sync events from The Blue Alliance and pin one to your dashboard.
          </p>
        </div>

        {/* Sync form */}
        {isCaptain && (
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
              <SyncEventForm />
            </div>
          </div>
        )}

        {/* Events grid */}
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-300">No events synced yet</p>
            <p className="mt-1 text-xs text-gray-500">
              {isCaptain
                ? "Use the form above to sync your first event."
                : "Ask your team captain to sync an event to get started."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedEvents.map((oe) => {
              const ev = oe.events;
              if (!ev) return null;
              const status = getEventStatus(ev.start_date, ev.end_date);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const syncedByName = (oe as any).profiles?.display_name as string | null | undefined;

              const dateRange = ev.start_date
                ? ev.end_date
                  ? `${formatDateShort(ev.start_date)} – ${formatDateShort(ev.end_date)}`
                  : formatDateShort(ev.start_date)
                : null;

              return (
                <div
                  key={oe.id}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${
                    oe.is_pinned
                      ? "border-teal-500/25 bg-teal-500/[0.035]"
                      : status === "live"
                      ? "border-teal-500/20 bg-teal-500/[0.025]"
                      : status === "upcoming"
                      ? "border-amber-500/15 bg-amber-500/[0.02]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Status accent line */}
                  <div
                    className={`h-px w-full ${
                      status === "live"
                        ? "bg-gradient-to-r from-transparent via-teal-400/70 to-transparent"
                        : status === "upcoming"
                        ? "bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
                        : oe.is_pinned
                        ? "bg-gradient-to-r from-transparent via-teal-500/40 to-transparent"
                        : "bg-white/[0.04]"
                    }`}
                  />

                  <div className="flex flex-1 flex-col p-5">
                    {/* Status badges + pin button */}
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {status === "live" && (
                          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            Live
                          </span>
                        )}
                        {status === "upcoming" && (
                          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/20">
                            Soon
                          </span>
                        )}
                        {status === "future" && (
                          <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-sky-400 ring-1 ring-sky-500/15">
                            Coming
                          </span>
                        )}
                        {status === "past" && (
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 ring-1 ring-white/10">
                            Past
                          </span>
                        )}
                        <PinnedBadge
                          orgEventId={oe.id}
                          initialPinned={oe.is_pinned ?? false}
                        />
                      </div>
                      <PinButton
                        orgEventId={oe.id}
                        isPinned={oe.is_pinned ?? false}
                        isCaptain={isCaptain}
                      />
                    </div>

                    {/* Event info */}
                    <Link
                      href={`/dashboard/events/${ev.tba_key}`}
                      className="flex-1"
                    >
                      {ev.year && (
                        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                          {ev.year}
                        </p>
                      )}
                      <h3 className="text-[15px] font-semibold leading-snug text-white transition-colors group-hover:text-teal-200">
                        {ev.name}
                      </h3>

                      <div className="mt-3 space-y-1.5">
                        {ev.location && (
                          <p className="flex items-center gap-1.5 text-xs text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {ev.location}
                          </p>
                        )}
                        {dateRange && (
                          <p className="flex items-center gap-1.5 text-xs text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {dateRange}
                          </p>
                        )}
                      </div>
                    </Link>

                    {/* Footer */}
                    <div className="mt-4 space-y-2.5 border-t border-white/[0.05] pt-3.5">
                      <div className="flex items-center justify-between gap-2">
                        {oe.is_attending ? (
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
                        <Link
                          href={`/dashboard/events/${ev.tba_key}`}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-300"
                        >
                          Open
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </div>
                      {syncedByName && (
                        <p className="text-[11px] text-gray-600">
                          Synced by {syncedByName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
