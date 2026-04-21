import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TeamStatsTable } from "./team-stats-table";
import { SyncStatsButton } from "./sync-stats-button";
import { EventTour } from "./event-tour";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventKey: string }>;
}): Promise<Metadata> {
  const { eventKey } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("name, year")
    .eq("tba_key", eventKey)
    .single();
  const title = event
    ? `${event.year ? `${event.year} ` : ""}${event.name} | PitPilot`
    : "Event | PitPilot";
  return { title };
}

function formatSyncTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventKey: string }>;
}) {
  const { eventKey } = await params;
  const supabase = await createClient();
  const t = await getServerT();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id, organizations(team_number)")
    .eq("id", user.id)
    .single();

  const orgTeamNumber = (profile?.organizations as { team_number: number | null } | null)?.team_number ?? null;

  // Get event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("tba_key", eventKey)
    .single();

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center dashboard-page">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{t("event.notFound")}</h1>
          <p className="text-gray-400">
            {t("event.notFoundSub", { key: eventKey })}
          </p>
          <Link
            href="/dashboard"
            className="back-button"
          >
            {t("event.backToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  const { data: eventTeams } = await supabase
    .from("event_teams")
    .select("team_number")
    .eq("event_id", event.id);

  const eventTeamNumbers = (eventTeams ?? []).map((team) => team.team_number);
  const isOrgInEvent = orgTeamNumber !== null && eventTeamNumbers.includes(orgTeamNumber);

  const { data: matches } = await supabase
    .from("matches")
    .select("red_teams, blue_teams, red_score, blue_score")
    .eq("event_id", event.id);

  const matchCount = matches?.length ?? 0;

  const { data: lastSync } = await supabase
    .from("team_event_stats")
    .select("last_synced_at")
    .eq("event_id", event.id)
    .order("last_synced_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const lastSyncLabel = formatSyncTime(lastSync?.last_synced_at ?? null);

  const winRecord = new Map<
    number,
    { wins: number; losses: number; ties: number }
  >();

  const ensureRecord = (team: number) => {
    if (!winRecord.has(team)) {
      winRecord.set(team, { wins: 0, losses: 0, ties: 0 });
    }
    return winRecord.get(team)!;
  };

  for (const match of matches ?? []) {
    if (match.red_score === null || match.blue_score === null) continue;

    const isTie = match.red_score === match.blue_score;
    if (isTie) {
      match.red_teams.forEach((team) => ensureRecord(team).ties++);
      match.blue_teams.forEach((team) => ensureRecord(team).ties++);
      continue;
    }

    const redWon = (match.red_score ?? 0) > (match.blue_score ?? 0);
    match.red_teams.forEach((team) => {
      const record = ensureRecord(team);
      if (redWon) {
        record.wins++;
      } else {
        record.losses++;
      }
    });
    match.blue_teams.forEach((team) => {
      const record = ensureRecord(team);
      if (redWon) {
        record.losses++;
      } else {
        record.wins++;
      }
    });
  }

  const winRateMap = new Map<number, number | null>();
  for (const [team, record] of winRecord.entries()) {
    const total = record.wins + record.losses + record.ties;
    winRateMap.set(team, total > 0 ? record.wins / total : null);
  }

  // Get team stats for this event
  const { data: stats } = await supabase
    .from("team_event_stats")
    .select("*")
    .eq("event_id", event.id)
    .order("epa", { ascending: false, nullsFirst: false });

  const statMap = new Map((stats ?? []).map((stat) => [stat.team_number, stat]));
  const baseTeamNumbers =
    eventTeamNumbers.length > 0
      ? eventTeamNumbers
      : Array.from(statMap.keys());
  const teamCount = baseTeamNumbers.length;
  const { data: teams } = await supabase
    .from("teams")
    .select("team_number, name, city, state")
    .in("team_number", baseTeamNumbers.length > 0 ? baseTeamNumbers : [0]);

  const teamsMap = new Map(teams?.map((t) => [t.team_number, t]) ?? []);

  // Merge stats with team info
  const tableData = baseTeamNumbers.map((teamNumber) => {
    const stat = statMap.get(teamNumber);
    const team = teamsMap.get(teamNumber);
    return {
      team_number: teamNumber,
      name: team?.name ?? "Unknown",
      city: team?.city ?? "",
      state: team?.state ?? "",
      epa: stat?.epa ?? null,
      auto_epa: stat?.auto_epa ?? null,
      teleop_epa: stat?.teleop_epa ?? null,
      endgame_epa: stat?.endgame_epa ?? null,
      win_rate: winRateMap.get(teamNumber) ?? null,
    };
  });

  const eventTitle = event.year ? `${event.year} ${event.name}` : event.name;

  return (
    <div className="min-h-screen dashboard-page">
      <EventTour />
      <main className="mx-auto max-w-7xl px-6 pb-12 pt-10">

        {/* ── Event header card ── */}
        <div data-tour="event-header" className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          {/* Top accent line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />

          <div className="px-6 py-5">
            {/* Breadcrumb + back */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                {t("event.overview")}
              </p>
              <Link
                href="/dashboard/events"
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-white/20 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("common.back")}
              </Link>
            </div>

            {/* Title row */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight text-white">{eventTitle}</h1>
              {orgTeamNumber !== null && !isOrgInEvent && (
                <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-gray-400 ring-1 ring-white/10">
                  {t("event.notAttending")}
                </span>
              )}
            </div>

            {/* Meta chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {event.location && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {event.location}
                </span>
              )}
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                {event.year}
              </span>
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                {teamCount} teams
              </span>
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                {matchCount} matches
              </span>
              {lastSyncLabel && (
                <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-500 ring-1 ring-white/[0.07]">
                  {t("event.lastSync", { time: lastSyncLabel })}
                </span>
              )}
            </div>
          </div>

          {/* ── Nav tab strip ── */}
          <div data-tour="event-actions" className="flex items-center gap-0.5 border-t border-white/[0.06] px-3 py-2">
            <Link
              href={`/dashboard/events/${eventKey}/matches`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-teal-300 transition hover:bg-teal-500/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              {t("event.scoutMatchesBtn")}
            </Link>

            <div className="mx-1 h-4 w-px bg-white/10" />

            {profile?.role === "captain" && (
              <Link
                href={`/dashboard/events/${eventKey}/assignments`}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                {t("event.assignments")}
              </Link>
            )}

            <Link
              href={`/dashboard/events/${eventKey}/analytics`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              {t("event.analytics")}
            </Link>

            <Link
              href={`/dashboard/events/${eventKey}/scouting-overview`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              {t("event.scoutReports")}
            </Link>

            {isOrgInEvent && (
              <Link
                href={`/dashboard/events/${eventKey}/draft`}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                {t("event.draftRoom")}
              </Link>
            )}

            {profile?.role === "captain" && (
              <Link
                href={`/dashboard/events/${eventKey}/customize`}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                {t("event.formSetup")}
              </Link>
            )}

            {/* Sync stats pushed to the right */}
            {profile?.role === "captain" && (
              <div className="ml-auto">
                <SyncStatsButton eventKey={eventKey} compact />
              </div>
            )}
          </div>
        </div>

        {/* ── Team stats table ── */}
        <div data-tour="event-team-stats">
          {tableData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 dashboard-panel p-10 text-center">
              <p className="text-sm font-medium text-gray-300">{t("event.noStats")}</p>
              <p className="mt-1 text-xs text-gray-500">
                {t("event.noStatsSub")}
              </p>
            </div>
          ) : (
            <TeamStatsTable
              data={tableData}
              eventKey={eventKey}
              highlightTeam={orgTeamNumber}
            />
          )}
        </div>
      </main>
    </div>
  );
}
