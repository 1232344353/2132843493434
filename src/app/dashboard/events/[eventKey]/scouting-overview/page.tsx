import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoutingOverviewClient } from "./scouting-overview-client";
import type { TeamScoutData } from "./scouting-overview-client";

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
    ? `Scout Reports: ${event.year ? `${event.year} ` : ""}${event.name} | PitPilot`
    : "Scout Reports | PitPilot";
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

export default async function ScoutingOverviewPage({
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

  const { data: matches } = await supabase
    .from("matches")
    .select("id, comp_level, match_number, set_number")
    .eq("event_id", event.id)
    .order("comp_level")
    .order("set_number", { ascending: true, nullsFirst: true })
    .order("match_number");

  const matchIds = matches?.map((m) => m.id) ?? [];

  const matchLabelMap = new Map(
    (matches ?? []).map((m) => [
      m.id,
      compLabel(m.comp_level, m.match_number, m.set_number),
    ])
  );

  const scoutingEntries =
    matchIds.length > 0
      ? (
          await supabase
            .from("scouting_entries")
            .select("id, match_id, team_number, auto_score, teleop_score, endgame_score, profiles(display_name)")
            .eq("org_id", profile.org_id)
            .in("match_id", matchIds)
            .order("created_at", { ascending: true })
        ).data ?? []
      : [];

  const pitEntries =
    (
      await supabase
        .from("pit_scout_entries")
        .select("team_number, drivetrain, intake_types, scoring_ranges, climb_capability, auto_description, notes")
        .eq("org_id", profile.org_id)
        .eq("event_id", event.id)
    ).data ?? [];

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
        scoutedBy:
          (e.profiles as { display_name: string | null } | null)?.display_name ??
          "Unknown",
      })),
      pitScout: pitMap.get(tn) ?? null,
    }))
    .sort((a, b) => b.entries.length - a.entries.length);

  const totalEntries = scoutingEntries.length;
  const pitScoutedCount = pitEntries.length;

  return (
    <div className="min-h-screen dashboard-page">
      <main className="mx-auto max-w-4xl px-6 pb-12 pt-10">
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
