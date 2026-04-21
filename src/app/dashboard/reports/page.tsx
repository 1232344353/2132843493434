import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsList } from "./reports-list";
import type { EventGroup } from "./reports-list";

export const metadata: Metadata = {
  title: "My Reports | PitPilot",
  description: "Review every scouting report you have submitted.",
};

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/join");

  const [reportsResult, pitResult] = await Promise.all([
    supabase
      .from("scouting_entries")
      .select(
        "id, created_at, team_number, match_id, scouted_by, auto_score, teleop_score, endgame_score, defense_rating, reliability_rating, notes, profiles(display_name), matches(comp_level, match_number, set_number, event_id, events(name, year, tba_key, location))"
      )
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("pit_scout_entries")
      .select(
        "id, created_at, team_number, event_id, scouted_by, drivetrain, intake_types, scoring_ranges, climb_capability, auto_description, notes, profiles(display_name), events(name, year, tba_key, location)"
      )
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false }),
  ]);

  const isCaptain = profile?.role === "captain";

  const normalizedReports = (reportsResult.data ?? []).map((r) => {
    const matchRaw = Array.isArray(r.matches) ? r.matches[0] : r.matches;
    const eventRaw = matchRaw
      ? Array.isArray(matchRaw.events)
        ? matchRaw.events[0]
        : matchRaw.events
      : null;
    return {
      ...r,
      matches: matchRaw ? { ...matchRaw, events: eventRaw } : null,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
    };
  });

  const normalizedPitReports = (pitResult.data ?? []).map((p) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
    events: Array.isArray(p.events) ? p.events[0] : p.events,
  }));

  // Group by event (keyed by tba_key)
  const eventMap = new Map<string, EventGroup>();

  for (const r of normalizedReports) {
    const event = r.matches?.events;
    const tbaKey = event?.tba_key ?? "__unknown__";
    const eventId = r.matches?.event_id ?? "";
    if (!eventMap.has(tbaKey)) {
      eventMap.set(tbaKey, {
        tbaKey,
        eventId,
        eventTitle: event
          ? event.year
            ? `${event.year} ${event.name}`
            : event.name
          : "Unknown Event",
        location: event?.location ?? null,
        matchEntries: [],
        pitEntries: [],
      });
    }
    eventMap.get(tbaKey)!.matchEntries.push(r as never);
  }

  for (const p of normalizedPitReports) {
    const tbaKey = p.events?.tba_key ?? "__unknown__";
    if (!eventMap.has(tbaKey)) {
      eventMap.set(tbaKey, {
        tbaKey,
        eventId: p.event_id,
        eventTitle: p.events
          ? p.events.year
            ? `${p.events.year} ${p.events.name}`
            : p.events.name
          : "Unknown Event",
        location: p.events?.location ?? null,
        matchEntries: [],
        pitEntries: [],
      });
    }
    const group = eventMap.get(tbaKey)!;
    if (!group.eventId) group.eventId = p.event_id;
    group.pitEntries.push(p as never);
  }

  // Sort events by most recent entry
  const eventGroups = Array.from(eventMap.values()).sort((a, b) => {
    const latest = (g: EventGroup) =>
      Math.max(
        ...g.matchEntries.map((e) => new Date(e.created_at).valueOf()),
        ...g.pitEntries.map((e) => new Date(e.created_at).valueOf()),
        0
      );
    return latest(b) - latest(a);
  });

  return (
    <div className="min-h-screen dashboard-page">
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 space-y-6">
        <ReportsList
          eventGroups={eventGroups}
          orgId={profile.org_id}
          isCaptain={isCaptain}
          userId={user.id}
        />
      </main>
    </div>
  );
}
