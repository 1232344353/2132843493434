import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AssignmentGrid } from "./assignment-grid";
import { MyAssignments } from "./my-assignments";
import { AssignmentsTour } from "./assignments-tour";

export default async function AssignmentsPage({
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
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/join");

  const isCaptain = profile.role === "captain";

  const { data: org } = await supabase
    .from("organizations")
    .select("team_number")
    .eq("id", profile.org_id)
    .single();

  // Get event
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

  // Get matches ordered by comp_level, set_number, and match_number
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", event.id)
    .order("comp_level", { ascending: true })
    .order("set_number", { ascending: true, nullsFirst: true })
    .order("match_number", { ascending: true });

  // Get org members
  const { data: members } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("org_id", profile.org_id);

  // Get existing assignments
  const { data: assignments } = await supabase
    .from("scout_assignments")
    .select("*")
    .eq("org_id", profile.org_id)
    .in(
      "match_id",
      (matches ?? []).map((m) => m.id)
    );

  const eventTitle = event.year ? `${event.year} ${event.name}` : event.name;

  return (
    <div className="min-h-screen dashboard-page">
      <AssignmentsTour isCaptain={isCaptain} />
      <main className="mx-auto max-w-7xl px-6 pb-12 pt-10">

        {/* Header card */}
        <div data-tour="assignments-header" className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white">Scout Assignments</h1>
              {isCaptain && (
                <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-medium text-teal-400 ring-1 ring-teal-500/20">
                  Captain view
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {isCaptain
                ? "Assign scouts to matches for your team."
                : "Your scouting assignments for this event."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                {(matches ?? []).length} matches
              </span>
              {isCaptain && (
                <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.07]">
                  {(members ?? []).length} members
                </span>
              )}
            </div>
          </div>
        </div>

        <div data-tour="assignments-workspace">
          {isCaptain ? (
            <AssignmentGrid
              matches={matches ?? []}
              members={members ?? []}
              assignments={assignments ?? []}
              orgId={profile.org_id}
              eventKey={eventKey}
              orgTeamNumber={org?.team_number ?? null}
            />
          ) : (
            <MyAssignments
              matches={matches ?? []}
              assignments={(assignments ?? []).filter(
                (a) => a.assigned_to === user.id
              )}
            />
          )}
        </div>
      </main>
    </div>
  );
}
