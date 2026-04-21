import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { ScoutingOverviewClient } from "./scouting-overview-client";
import type { TeamScoutData } from "./scouting-overview-client";
import { OverviewTour } from "./overview-tour";

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
    ? `Scouting Overview: ${event.year ? `${event.year} ` : ""}${event.name} | PitPilot`
    : "Scouting Overview | PitPilot";
  return { title };
}

function compLabel(
  compLevel: string,
  matchNumber: number,
  setNumber?: number | null
): string {
  const hasLegacy =
    compLevel !== "qm" && !setNumber && matchNumber >= 100;
  const normalizedSet = hasLegacy
    ? Math.floor(matchNumber / 100)
    : setNumber ?? null;
  const normalizedMatch = hasLegacy ? matchNumber % 100 : matchNumber;
  if (compLevel === "qm") return `Qual ${normalizedMatch}`;
  const prefix =
    compLevel === "sf" ? "SF" : compLevel === "f" ? "F" : compLevel.toUpperCase();
  return normalizedSet
    ? `${prefix} ${normalizedSet}-${normalizedMatch}`
    : `${prefix} ${normalizedMatch}`;
}

function formatSyncTime(value: string | null): string | null {
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

export default async function ScoutingOverviewPage({
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
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/join");

  const { data: event } = await supabase
    .from("events")
    .select("id, name, year, location")
    .eq("tba_key", eventKey)
    .single();

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center dashboard-page">
        <p className="text-gray-400">Event not found.</p>
      </div>
    );
  }

  const [matchesResult, eventTeamsResult, lastSyncResult] = await Promise.all([
    supabase
      .from("matches")
      .select("id, comp_level, match_number, set_number")
      .eq("event_id", event.id)
      .order("comp_level")
      .order("set_number", { ascending: true, nullsFirst: true })
      .order("match_number"),
    supabase
      .from("event_teams")
      .select("team_number", { count: "exact", head: true })
      .eq("event_id", event.id),
    supabase
      .from("team_event_stats")
      .select("last_synced_at")
      .eq("event_id", event.id)
      .order("last_synced_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const matches = matchesResult.data ?? [];
  const matchIds = matches.map((m) => m.id);
  const matchCount = matches.length;
  const teamCount = eventTeamsResult.count ?? 0;
  const lastSyncLabel = formatSyncTime(lastSyncResult.data?.last_synced_at ?? null);

  const matchLabelMap = new Map(
    matches.map((m) => [
      m.id,
      compLabel(m.comp_level, m.match_number, m.set_number),
    ])
  );

  const [scoutingResult, pitResult] = await Promise.all([
    matchIds.length > 0
      ? supabase
          .from("scouting_entries")
          .select("id, match_id, team_number, auto_score, teleop_score, endgame_score, defense_rating, reliability_rating, notes, profiles(display_name)")
          .eq("org_id", profile.org_id)
          .in("match_id", matchIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from("pit_scout_entries")
      .select("team_number, drivetrain, intake_types, scoring_ranges, climb_capability, auto_description, notes")
      .eq("org_id", profile.org_id)
      .eq("event_id", event.id),
  ]);

  const scoutingEntries = scoutingResult.data ?? [];
  const pitEntries = pitResult.data ?? [];

  const allTeamNumbers = Array.from(
    new Set([
      ...scoutingEntries.map((e) => e.team_number),
      ...pitEntries.map((p) => p.team_number),
    ])
  );

  const { data: teams } = await supabase
    .from("teams")
    .select("team_number, name")
    .in("team_number", allTeamNumbers.length > 0 ? allTeamNumbers : [0]);

  const teamNameMap = new Map(
    (teams ?? []).map((t) => [t.team_number, t.name ?? `Team ${t.team_number}`])
  );

  const toArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const pitMap = new Map(
    pitEntries.map((p) => [
      p.team_number,
      {
        drivetrain: p.drivetrain ?? null,
        intakeTypes: toArr(p.intake_types),
        scoringRanges: toArr(p.scoring_ranges),
        climbCapability: p.climb_capability ?? null,
        autoDescription: p.auto_description ?? null,
        notes: p.notes ?? null,
      },
    ])
  );

  const entriesByTeam = new Map<number, typeof scoutingEntries>();
  for (const entry of scoutingEntries) {
    if (!entriesByTeam.has(entry.team_number)) {
      entriesByTeam.set(entry.team_number, []);
    }
    entriesByTeam.get(entry.team_number)!.push(entry);
  }

  const teamData: TeamScoutData[] = allTeamNumbers
    .map((tn) => ({
      teamNumber: tn,
      teamName: teamNameMap.get(tn) ?? `Team ${tn}`,
      entries: (entriesByTeam.get(tn) ?? []).map((e) => ({
        id: e.id,
        matchId: e.match_id,
        matchLabel: matchLabelMap.get(e.match_id) ?? "?",
        autoScore: e.auto_score,
        teleopScore: e.teleop_score,
        endgameScore: e.endgame_score,
        defenseRating: e.defense_rating,
        reliabilityRating: e.reliability_rating,
        notes: e.notes ?? null,
        scoutedBy:
          (e.profiles as { display_name: string | null } | null)?.display_name ??
          "Unknown",
      })),
      pitScout: pitMap.get(tn) ?? null,
    }))
    .sort((a, b) => b.entries.length - a.entries.length);

  const totalEntries = scoutingEntries.length;
  const pitScoutedCount = pitEntries.length;
  const eventTitle = event.year ? `${event.year} ${event.name}` : event.name;

  const metaParts: string[] = [];
  if (event.location) metaParts.push(event.location);
  if (event.year) metaParts.push(String(event.year));
  if (teamCount > 0) metaParts.push(`${teamCount} teams`);
  if (matchCount > 0) metaParts.push(`${matchCount} matches`);
  if (lastSyncLabel) metaParts.push(`Synced ${lastSyncLabel}`);

  return (
    <div className="min-h-screen dashboard-page">
      <OverviewTour />
      <main className="mx-auto max-w-4xl px-6 pb-12 pt-10">

        {/* Event header card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          <div className="px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                {t("overview.eventOverview")}
              </p>
              <Link
                href={`/dashboard/events/${eventKey}`}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-white/20 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                {t("common.back")}
              </Link>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white">{eventTitle}</h2>
            {metaParts.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {metaParts.map((part, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-1.5 text-gray-700">·</span>}
                    {part}
                  </span>
                ))}
              </p>
            )}
          </div>

          {/* Tab strip */}
          <div className="flex items-center gap-0.5 border-t border-white/[0.06] px-3 py-2">
            <Link
              href={`/dashboard/events/${eventKey}/matches`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              {t("nav.matches")}
            </Link>

            <Link
              href={`/dashboard/events/${eventKey}/analytics`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              {t("nav.analytics")}
            </Link>

            <span className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-teal-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              {t("event.scoutReports")}
            </span>
          </div>
        </div>

        <ScoutingOverviewClient
          eventId={event.id}
          eventKey={eventKey}
          teamData={teamData}
          totalEntries={totalEntries}
          pitScoutedCount={pitScoutedCount}
        />
      </main>
    </div>
  );
}
