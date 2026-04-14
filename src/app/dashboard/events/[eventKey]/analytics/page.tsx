import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { AnalyticsTour } from "./analytics-tour";
import { buildLabelMap, resolveLabels } from "@/lib/platform-settings";
import { getEffectiveEventFormConfig } from "@/lib/event-form-config";

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
    ? `Analytics: ${event.year ? `${event.year} ` : ""}${event.name} | PitPilot`
    : "Analytics | PitPilot";
  return { title };
}

function compLabel(
  compLevel: string,
  matchNumber: number,
  setNumber?: number | null
) {
  const hasLegacy =
    compLevel !== "qm" && !setNumber && matchNumber >= 100;
  const normalizedSet = hasLegacy
    ? Math.floor(matchNumber / 100)
    : setNumber ?? null;
  const normalizedMatch = hasLegacy ? matchNumber % 100 : matchNumber;

  if (compLevel === "qm") return `Qual ${normalizedMatch}`;

  const prefix =
    compLevel === "sf"
      ? "SF"
      : compLevel === "f"
      ? "F"
      : compLevel.toUpperCase();

  return normalizedSet
    ? `${prefix} ${normalizedSet}-${normalizedMatch}`
    : `${prefix} ${normalizedMatch}`;
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ eventKey: string }>;
}) {
  const { eventKey } = await params;
  const supabase = await createClient();

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
    .select("id, name, year")
    .eq("tba_key", eventKey)
    .single();

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center dashboard-page">
        <p className="text-gray-400">Event not found.</p>
      </div>
    );
  }

  // Get all matches
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", event.id)
    .order("comp_level")
    .order("set_number", { ascending: true, nullsFirst: true })
    .order("match_number");

  const matchIds = matches?.map((m) => m.id) ?? [];

  // Get all scouting entries for this event (org-scoped)
  const scoutingEntries =
    matchIds.length > 0
      ? (
          await supabase
            .from("scouting_entries")
            .select("*, profiles(display_name)")
            .eq("org_id", profile.org_id)
            .in("match_id", matchIds)
            .order("created_at", { ascending: true })
        ).data ?? []
      : [];

  // Get team EPA stats
  const { data: stats } = await supabase
    .from("team_event_stats")
    .select("*")
    .eq("event_id", event.id);

  const statsMap = new Map(
    (stats ?? []).map((s) => [s.team_number, s])
  );

  // Get team names
  const teamNumbers = Array.from(
    new Set(scoutingEntries.map((e) => e.team_number))
  );
  const { data: teams } = await supabase
    .from("teams")
    .select("team_number, name")
    .in("team_number", teamNumbers.length > 0 ? teamNumbers : [0]);

  const teamNameMap = new Map(
    (teams ?? []).map((t) => [t.team_number, t.name])
  );

  // Build match label lookup
  const matchMap = new Map(
    (matches ?? []).map((m) => [
      m.id,
      {
        label: compLabel(m.comp_level, m.match_number, m.set_number),
        redTeams: m.red_teams as number[],
        blueTeams: m.blue_teams as number[],
      },
    ])
  );

  // Safely parse Json fields from Supabase
  function toStringArray(val: unknown): string[] {
    if (Array.isArray(val)) return val.filter((v): v is string => typeof v === "string");
    return [];
  }
  function toBoolRecord(val: unknown): Record<string, boolean> | null {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const out: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (typeof v === "boolean") out[k] = v;
      }
      return Object.keys(out).length > 0 ? out : null;
    }
    return null;
  }

  // Fetch form config for label resolution
  const { formConfig } = await getEffectiveEventFormConfig(supabase, profile.org_id, eventKey);
  const intakeLabelMap = buildLabelMap(formConfig.intakeOptions);
  const climbLabelMap = buildLabelMap(formConfig.climbLevelOptions);
  const shootingLabelMap = buildLabelMap(formConfig.shootingRangeOptions);

  // Build data for client
  const scoutingRows = scoutingEntries.map((entry) => {
    const match = matchMap.get(entry.match_id);
    return {
      matchLabel: match?.label ?? "?",
      teamNumber: entry.team_number,
      teamName: teamNameMap.get(entry.team_number) ?? "Unknown",
      scoutedBy: entry.profiles?.display_name ?? "Unknown",
      autoScore: entry.auto_score,
      autoStartPosition: entry.auto_start_position ?? null,
      autoNotes: entry.auto_notes || "",
      teleopScore: entry.teleop_score,
      intakeMethods: resolveLabels(toStringArray(entry.intake_methods), intakeLabelMap),
      endgameScore: entry.endgame_score,
      climbLevels: resolveLabels(toStringArray(entry.climb_levels), climbLabelMap),
      shootingRanges: resolveLabels(toStringArray(entry.shooting_ranges), shootingLabelMap),
      shootingReliability: entry.shooting_reliability ?? null,
      cycleTimeRating: entry.cycle_time_rating ?? null,
      defenseRating: entry.defense_rating,
      reliabilityRating: entry.reliability_rating,
      abilityAnswers: toBoolRecord(entry.ability_answers),
      notes: entry.notes || "",
    };
  });

  const teamStatsData = teamNumbers.map((num) => {
    const stat = statsMap.get(num);
    const teamEntries = scoutingEntries.filter((e) => e.team_number === num);
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      teamNumber: num,
      teamName: teamNameMap.get(num) ?? "Unknown",
      entryCount: teamEntries.length,
      scoutAvg: teamEntries.length > 0
        ? {
            auto: avg(teamEntries.map((e) => e.auto_score)),
            teleop: avg(teamEntries.map((e) => e.teleop_score)),
            endgame: avg(teamEntries.map((e) => e.endgame_score)),
          }
        : null,
      epa: stat
        ? {
            auto: stat.auto_epa,
            teleop: stat.teleop_epa,
            endgame: stat.endgame_epa,
            total: stat.epa,
          }
        : null,
      avgDefense: teamEntries.length > 0
        ? avg(teamEntries.map((e) => e.defense_rating))
        : null,
      avgReliability: teamEntries.length > 0
        ? avg(teamEntries.map((e) => e.reliability_rating))
        : null,
    };
  });

  const eventTitle = event.year ? `${event.year} ${event.name}` : event.name;

  return (
    <div className="min-h-screen dashboard-page">
      <AnalyticsTour />
      <main className="mx-auto max-w-7xl px-6 pb-12 pt-10 space-y-6">

        {/* Header card */}
        <div data-tour="analytics-header" className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          <div className="px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                {eventTitle}
              </p>
              <Link
                href={`/dashboard/events/${eventKey}`}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-white/20 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </Link>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Scouting data and performance trends for your team.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                {scoutingEntries.length} {scoutingEntries.length === 1 ? "entry" : "entries"}
              </span>
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                {teamNumbers.length} teams scouted
              </span>
            </div>
          </div>
        </div>

        <AnalyticsDashboard
          eventTitle={eventTitle}
          eventKey={eventKey}
          scoutingRows={scoutingRows}
          teamStats={teamStatsData}
        />
      </main>
    </div>
  );
}
