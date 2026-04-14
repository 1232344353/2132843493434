import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchEventRankings } from "@/lib/tba";
import type { PickListContent } from "@/types/strategy";
import { DraftRoom } from "./draft-room";
import { getEffectiveEventFormConfig } from "@/lib/event-form-config";
import { DraftTour } from "./draft-tour";

export default async function DraftRoomPage({
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
    .select("org_id, display_name")
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
      <div className="min-h-screen dashboard-page">
        <main className="mx-auto max-w-3xl px-4 pb-12 pt-10">
          <div className="rounded-2xl dashboard-panel p-8 text-center">
            <p className="text-gray-400">
              Event not found. Sync it first from the dashboard.
            </p>
            <Link href="/dashboard" className="back-button mt-4">
              Back to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  let rankings: Array<{ rank: number; teamNumber: number }> = [];
  try {
    rankings = await fetchEventRankings(eventKey);
  } catch {
    rankings = [];
  }
  rankings = rankings.sort((a, b) => a.rank - b.rank);

  const { data: eventTeams } = await supabase
    .from("event_teams")
    .select("team_number")
    .eq("event_id", event.id);

  const teamSet = new Set<number>(
    rankings.map((r) => r.teamNumber).filter((num) => !Number.isNaN(num))
  );
  for (const row of eventTeams ?? []) {
    teamSet.add(row.team_number);
  }

  const teamNumbers = Array.from(teamSet);
  const { data: teams } = await supabase
    .from("teams")
    .select("team_number, name")
    .in("team_number", teamNumbers.length > 0 ? teamNumbers : [0]);

  const teamNames: Record<number, string> = {};
  for (const team of teams ?? []) {
    teamNames[team.team_number] = team.name ?? `Team ${team.team_number}`;
  }

  const { data: pickListRow } = await supabase
    .from("pick_lists")
    .select("content")
    .eq("event_id", event.id)
    .eq("org_id", profile.org_id)
    .maybeSingle();

  const pickList = pickListRow?.content as PickListContent | null;

  const { data: draftSession, error: draftSessionError } = await supabase
    .from("draft_sessions")
    .select("id, state")
    .eq("event_id", event.id)
    .eq("org_id", profile.org_id)
    .maybeSingle();
  const storageEnabled = !draftSessionError;

  const [eventTitle, { formConfig: scoutingFormConfig }] = await Promise.all([
    Promise.resolve(event.year ? `${event.year} ${event.name}` : event.name),
    getEffectiveEventFormConfig(supabase, profile.org_id, eventKey),
  ]);

  return (
    <div className="min-h-screen dashboard-page">
      <DraftTour />
      <main className="mx-auto max-w-7xl px-6 pb-12 pt-10 space-y-6">

        {/* Header card */}
        <div data-tour="draft-header" className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
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
            <h1 className="mt-2 text-2xl font-bold text-white">Draft Room</h1>
            <p className="mt-1 text-sm text-gray-500">
              AI pick guidance on the left, manual draft board on the right.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                {teamNumbers.length} teams
              </span>
              {rankings.length > 0 && (
                <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                  Live rankings
                </span>
              )}
            </div>
          </div>
        </div>

        <DraftRoom
          eventId={event.id}
          eventKey={eventKey}
          eventName={event.name}
          userName={profile?.display_name ?? null}
          orgId={profile.org_id}
          rankings={rankings}
          teamNames={teamNames}
          pickList={pickList}
          existingSession={draftSession ?? null}
          storageEnabled={storageEnabled}
          formConfig={scoutingFormConfig}
        />
      </main>
    </div>
  );
}
