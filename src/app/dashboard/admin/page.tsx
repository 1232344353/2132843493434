import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminPanel } from "./admin-panel";
import {
  getEventSyncMinYear,
  getScoutingAbilityQuestions,
  getScoutingFormConfig,
  getPitScoutFormConfig,
  getTeamAiPromptLimits,
} from "@/lib/platform-settings";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_staff")
    .eq("id", user.id)
    .single();

  if (!profile?.is_staff) {
    redirect("/dashboard");
  }

  // Use admin client (service role) to bypass RLS and get site-wide counts
  const adminSupabase = createAdminClient();

  const [orgsRes, profilesRes, entriesRes, matchesRes, eventsRes] = await Promise.all([
    adminSupabase
      .from("organizations")
      .select("id, name, team_number, join_code, created_at")
      .order("created_at", { ascending: false }),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }),
    adminSupabase.from("scouting_entries").select("id", { count: "exact", head: true }),
    adminSupabase.from("matches").select("id", { count: "exact", head: true }),
    adminSupabase.from("events").select("id", { count: "exact", head: true }),
  ]);

  const parallelErrors = [
    orgsRes?.error,
    profilesRes?.error,
    entriesRes?.error,
    matchesRes?.error,
    eventsRes?.error,
  ].filter(Boolean);

  if (parallelErrors.length > 0) {
    // If any of the parallel queries failed, redirect to a safe page
    redirect("/dashboard");
  }

  const { data: testimonialsData, error: testimonialsError } = await adminSupabase
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (testimonialsError) {
    console.error("Failed to fetch testimonials:", testimonialsError);
  }

  const testimonials = testimonialsData ?? [];

  const { data: announcements, error: announcementsError } = await adminSupabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (announcementsError) {
    console.error("Error fetching announcements:", announcementsError);
  }

  const safeAnnouncements = announcements ?? [];

  const {
    data: contactMessagesData,
    error: contactMessagesError,
  } = await adminSupabase
    .from("contact_messages")
    .select("id, email, subject, message, status, response, created_at, responded_at")
    .order("created_at", { ascending: false });

  if (contactMessagesError) {
    console.error("Failed to load contact messages:", contactMessagesError);
  }

  const contactMessages = contactMessagesData ?? [];

  // Analytics: signups over time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();

  const [signupsRes, orgsTimeRes, entriesTimeRes, messagesTimeRes] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true }),
    adminSupabase
      .from("organizations")
      .select("created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true }),
    adminSupabase
      .from("scouting_entries")
      .select("created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true }),
    adminSupabase
      .from("team_messages")
      .select("created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true }),
  ]);

  if (signupsRes.error || orgsTimeRes.error || entriesTimeRes.error || messagesTimeRes.error) {
    throw new Error(
      [
        signupsRes.error && `signups: ${signupsRes.error.message}`,
        orgsTimeRes.error && `organizations: ${orgsTimeRes.error.message}`,
        entriesTimeRes.error && `scouting_entries: ${entriesTimeRes.error.message}`,
        messagesTimeRes.error && `team_messages: ${messagesTimeRes.error.message}`,
      ]
        .filter(Boolean)
        .join("; ") || "Failed to load analytics data",
    );
  }

  // Aggregate by day
  function aggregateByDay(rows: { created_at: string }[] | null): { date: string; count: number }[] {
    const map = new Map<string, number>();
    // Pre-fill last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    for (const row of rows ?? []) {
      const key = row.created_at.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }

  const analytics = {
    signups: aggregateByDay(signupsRes.data),
    organizations: aggregateByDay(orgsTimeRes.data),
    scoutingEntries: aggregateByDay(entriesTimeRes.data),
    messages: aggregateByDay(messagesTimeRes.data),
  };

  const [eventSyncMinYear, scoutingAbilityQuestions, teamAiPromptLimits, scoutingFormConfig, pitScoutFormConfig] = await Promise.all([
    getEventSyncMinYear(supabase),
    getScoutingAbilityQuestions(supabase),
    getTeamAiPromptLimits(supabase),
    getScoutingFormConfig(supabase),
    getPitScoutFormConfig(supabase),
  ]);

  return (
    <>
      <AdminPanel
        stats={{
          organizations: orgsRes.data?.length ?? 0,
          users: profilesRes.count ?? 0,
          entries: entriesRes.count ?? 0,
          matches: matchesRes.count ?? 0,
          events: eventsRes.count ?? 0,
        }}
        organizations={orgsRes.data ?? []}
        testimonials={testimonials}
        announcements={safeAnnouncements}
        contactMessages={contactMessages}
        analytics={analytics}
        eventSyncMinYear={eventSyncMinYear}
        scoutingAbilityQuestions={scoutingAbilityQuestions}
        teamAiPromptLimits={teamAiPromptLimits}
        scoutingFormConfig={scoutingFormConfig}
        pitScoutFormConfig={pitScoutFormConfig}
        adminName={profile.display_name ?? user.email ?? "Admin"}
        adminEmail={user.email ?? ""}
      />
    </>
  );
}
