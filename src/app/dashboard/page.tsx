import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { AnimateIn, StaggerGroup, StaggerChild } from "@/components/ui/animate-in";
import { PinnedEventHero } from "./pinned-event-hero";
import { DashboardTour } from "./dashboard-tour";
import { UsageLimitMeter } from "./usage-limit-meter";
import {
  TEAM_AI_WINDOW_MS,
  getTeamAiRateLimitKey,
  hasSupporterAccess,
  peekRateLimit,
} from "@/lib/rate-limit";
import { getTeamAiPromptLimits } from "@/lib/platform-settings";

export const metadata: Metadata = {
  title: "Dashboard | PitPilot",
  description: "Your FRC scouting dashboard: manage events, view data, and access AI strategy tools.",
};

const PLAN_LABELS = {
  free: "Free",
  supporter: "Supporter",
  gifted_supporter: "Gifted Supporter",
} as const;

const PLAN_BADGE_STYLES = {
  free: "border-white/10 bg-white/[0.04] text-gray-400",
  supporter: "border-teal-500/30 bg-teal-500/[0.12] text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.12)]",
  gifted_supporter: "border-amber-500/30 bg-amber-500/[0.12] text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]",
} as const;

const PLAN_ICONS = {
  free: null,
  supporter: (
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/>
    </svg>
  ),
  gifted_supporter: (
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/>
    </svg>
  ),
} as const;

function formatDate(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}


function compLabel(compLevel: string, matchNumber: number, setNumber?: number | null) {
  const hasLegacy = compLevel !== "qm" && !setNumber && matchNumber >= 100;
  const normalizedSet = hasLegacy ? Math.floor(matchNumber / 100) : setNumber ?? null;
  const normalizedMatch = hasLegacy ? matchNumber % 100 : matchNumber;
  if (compLevel === "qm") return `Qual ${normalizedMatch}`;
  const prefix = compLevel === "sf" ? "SF" : compLevel === "f" ? "F" : compLevel.toUpperCase();
  return normalizedSet ? `${prefix} ${normalizedSet}-${normalizedMatch}` : `${prefix} ${normalizedMatch}`;
}

function getEventStatus(startDate: string | null, endDate: string | null) {
  if (!startDate) return null;
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (end && now > end) return "past";
  if (now >= start && (!end || now <= end)) return "live";
  return "upcoming";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getServerT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    if (profile?.is_staff) redirect("/dashboard/admin");
    redirect("/join");
  }

  const org = profile.organizations;
  const planTier = (org?.plan_tier ?? "free") as keyof typeof PLAN_LABELS;
  const hasSupporterPlanAccess = hasSupporterAccess(org?.plan_tier);
  const teamAiPromptLimits = await getTeamAiPromptLimits(supabase);
  const currentPlanAiLimit = teamAiPromptLimits[hasSupporterPlanAccess ? "supporter" : "free"];
  const aiUsage = await peekRateLimit(
    getTeamAiRateLimitKey(profile.org_id),
    TEAM_AI_WINDOW_MS,
    currentPlanAiLimit
  );

  const { data: orgEvents } = await supabase
    .from("org_events")
    .select("id, is_attending, is_pinned, created_at, events(id, tba_key, name, location, start_date, end_date, year)")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  const pinnedOrgEvent = orgEvents?.find((oe) => oe.is_pinned) ?? null;
  const pinnedEvent = pinnedOrgEvent?.events ?? null;

  const eventsCount = orgEvents?.length ?? 0;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: memberCount },
    { count: scoutingCount },
    { count: scoutingWeekCount },
    { data: reportPreview },
    { data: leaderboardRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("org_id", profile.org_id),
    supabase.from("scouting_entries").select("*", { count: "exact", head: true }).eq("org_id", profile.org_id),
    supabase.from("scouting_entries").select("*", { count: "exact", head: true }).eq("org_id", profile.org_id).gte("created_at", weekAgo),
    supabase
      .from("scouting_entries")
      .select("id, created_at, team_number, match_id, auto_score, teleop_score, endgame_score, notes, profiles(display_name), matches(comp_level, match_number, set_number, events(name, year, tba_key))")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("scouting_entries")
      .select("scouted_by, profiles(display_name)")
      .eq("org_id", profile.org_id),
  ]);

  // Build leaderboard: count entries per scout
  const scoutCounts = new Map<string, { name: string; count: number }>();
  for (const entry of leaderboardRaw ?? []) {
    const p = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
    const name = (p as { display_name?: string | null } | null)?.display_name ?? "Scout";
    const existing = scoutCounts.get(entry.scouted_by);
    if (existing) existing.count++;
    else scoutCounts.set(entry.scouted_by, { name, count: 1 });
  }
  const leaderboard = Array.from(scoutCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const eventStatus = pinnedEvent
    ? getEventStatus(pinnedEvent.start_date, pinnedEvent.end_date)
    : null;

  return (
    <div className="min-h-screen dashboard-page">
      <DashboardTour />

      <main className="mx-auto max-w-7xl px-6 pb-16 pt-10">

        {/* ── Greeting box ── */}
        <AnimateIn delay={0} className="mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5">
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-48 rounded-full bg-teal-500/[0.07] blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                  {org?.team_number ? `Team ${org.team_number}` : org?.name}
                </p>
                {planTier !== "free" && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${PLAN_BADGE_STYLES[planTier]}`}
                  >
                    {PLAN_ICONS[planTier]}
                    {PLAN_LABELS[planTier]}
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-xl font-bold text-white">
                Welcome back, {profile.display_name ?? "Scout"}.
              </h1>
              <p className="mt-0.5 text-sm text-gray-400">
                Sync events and keep scouting data flowing for the next match.
              </p>
              <UsageLimitMeter
                limit={currentPlanAiLimit}
                remaining={aiUsage.remaining}
                resetAt={aiUsage.resetAt}
              />
            </div>
          </div>
        </AnimateIn>

        {/* ── Pinned Event Hero ── */}
        <AnimateIn delay={0} className="mb-6">
          {pinnedEvent ? (
            <PinnedEventHero
              event={{
                tba_key: pinnedEvent.tba_key ?? "",
                name: pinnedEvent.name ?? "",
                location: pinnedEvent.location ?? null,
                start_date: pinnedEvent.start_date ?? null,
                end_date: pinnedEvent.end_date ?? null,
                year: pinnedEvent.year ?? null,
              }}
              isAttending={pinnedOrgEvent?.is_attending ?? false}
              status={eventStatus}
            />
          ) : (
            <Link
              href="/dashboard/events"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] p-6 transition hover:border-teal-500/25 hover:bg-teal-500/[0.03]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gray-500 transition group-hover:bg-teal-500/10 group-hover:text-teal-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" x2="12" y1="17" y2="22" />
                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-300 transition group-hover:text-white">
                    No event pinned
                  </p>
                  <p className="text-xs text-gray-500">
                    Go to Events, sync a competition, and pin it to see it here.
                  </p>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-600 transition group-hover:text-teal-400">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}
        </AnimateIn>

        {/* ── Stats row ── */}
        <StaggerGroup className="mb-8 grid grid-cols-3 gap-3">
          {[
            {
              label: t("dashboard.eventsSynced"),
              value: eventsCount,
              weekDelta: null,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              ),
            },
            {
              label: t("dashboard.teamMembers"),
              value: memberCount ?? 0,
              weekDelta: null,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              ),
            },
            {
              label: t("dashboard.scoutingEntries"),
              value: scoutingCount ?? 0,
              weekDelta: scoutingWeekCount ?? 0,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
              ),
            },
          ].map((stat) => (
            <StaggerChild
              key={stat.label}
              className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/10"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600">{stat.icon}</span>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  {stat.label}
                </p>
              </div>
              <p className="mt-1.5 text-2xl font-bold text-white">{stat.value}</p>
              {stat.weekDelta != null && stat.weekDelta > 0 && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-400/60">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  +{stat.weekDelta} this week
                </div>
              )}
            </StaggerChild>
          ))}
        </StaggerGroup>

        {/* ── Scouting Reports ── */}
        <AnimateIn delay={0.2} className="space-y-4">
          <div data-tour="scouting-reports" className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">{t("dashboard.scoutingReports")}</h3>
              <p className="text-xs text-gray-400">{t("dashboard.latestEntries")}</p>
            </div>
            <Link
              href="/dashboard/reports"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/5"
            >
              {t("dashboard.viewAll")}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {reportPreview && reportPreview.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 pt-1 -mx-1 px-1">
              {reportPreview.map((report) => {
                const match = Array.isArray(report.matches) ? report.matches[0] : report.matches;
                const event = match ? (Array.isArray(match.events) ? match.events[0] : match.events) : null;
                const eventTitle = event?.year ? `${event.year} ${event.name}` : event?.name ?? "Event";
                const reportProfile = Array.isArray(report.profiles) ? report.profiles[0] : report.profiles;
                const scouterName = reportProfile?.display_name ?? "Teammate";
                const matchLabel =
                  match?.comp_level && match?.match_number
                    ? compLabel(match.comp_level, match.match_number, match.set_number)
                    : "Match";

                return (
                  <div
                    key={report.id}
                    className="min-w-[260px] max-w-[280px] flex-shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-gray-500">{eventTitle}</p>
                      <h4 className="text-base font-semibold text-white">Team {report.team_number}</h4>
                      <p className="text-xs text-gray-500">
                        {matchLabel} · {formatDate(report.created_at)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {t("dashboard.scoutedBy", { name: scouterName })}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/scout/${report.match_id}/${report.team_number}`}
                        className="flex items-center gap-1 rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-300 transition hover:bg-teal-500/15"
                      >
                        {t("dashboard.review")}
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                      {event?.tba_key && (
                        <Link
                          href={`/dashboard/events/${event.tba_key}`}
                          className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-gray-400 transition hover:border-white/20 hover:text-gray-200"
                        >
                          {t("dashboard.event")}
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-300">{t("dashboard.noReports")}</p>
              <p className="mt-1 text-xs text-gray-500">{t("dashboard.noReportsSub")}</p>
            </div>
          )}
        </AnimateIn>

        {/* ── Scouting Leaderboard ── */}
        {leaderboard.length > 0 && (
          <AnimateIn delay={0.35} className="mt-8">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Scout Leaderboard</h3>
                  <p className="text-xs text-gray-400">Total entries submitted this season</p>
                </div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {leaderboard.map((scout, i) => (
                  <div
                    key={scout.name}
                    className="flex items-center gap-4 px-5 py-3 transition hover:bg-white/[0.02]"
                  >
                    <span className={`w-5 text-center text-xs font-bold tabular-nums ${
                      i === 0 ? "text-amber-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-600"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-bold text-gray-300">
                      {scout.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="flex-1 text-sm font-medium text-white">{scout.name}</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1 rounded-full bg-teal-400/30"
                        style={{ width: `${Math.round((scout.count / leaderboard[0].count) * 64)}px` }}
                      >
                        <div
                          className="h-full rounded-full bg-teal-400"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-bold tabular-nums text-teal-400">
                        {scout.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        )}

      </main>
    </div>
  );
}
