import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";
import { NotificationsButton } from "@/components/notifications-button";
import {
  DashboardSidebarLinks,
  DashboardMobileNav,
} from "@/components/dashboard-sidebar-nav";

const BANNER_STYLES: Record<string, string> = {
  info: "border-teal-500/30 bg-teal-500/10 text-teal-100",
  success: "border-green-500/30 bg-green-500/10 text-green-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  danger: "border-red-500/30 bg-red-500/10 text-red-100",
};

export async function DashboardSidebar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select(
          "display_name, role, is_staff, org_id, organizations(team_number, name, plan_tier)"
        )
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: announcement } = await supabase
    .from("announcements")
    .select("message, variant")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const org = profile?.organizations as
    | {
        team_number: number | null;
        name: string | null;
        plan_tier: "free" | "supporter" | "gifted_supporter" | null;
      }
    | null
    | undefined;
  const teamLabel = org?.team_number
    ? `Team ${org.team_number}`
    : org?.name ?? null;

  const isStaff = profile?.is_staff === true;
  const displayName = profile?.display_name ?? user?.email ?? "Account";
  const roleLabel = (profile?.role as string | null | undefined) ?? "Member";

  return (
    <>
      {/* ── Desktop fixed sidebar ── */}
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r border-white/[0.05] bg-[#0a0f12] lg:flex">
        {/* Brand */}
        <div className="border-b border-white/[0.05] px-5 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="font-outfit text-lg font-bold tracking-tight text-white"
            >
              Pit<span className="text-teal-400">Pilot</span>
            </Link>
            <div className="flex items-center gap-1.5">
              <NotificationsButton />
              <Link
                href="/changelog"
                className="text-[10px] font-medium text-gray-600 transition hover:text-gray-400"
                title="View changelog"
              >
                v0.1.0
              </Link>
            </div>
          </div>
          {teamLabel && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              {teamLabel}
            </p>
          )}
        </div>

        {/* Announcement banner */}
        {announcement?.message && (
          <div
            className={`mx-3 mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${BANNER_STYLES[announcement.variant] ?? BANNER_STYLES.info}`}
          >
            {announcement.message}
          </div>
        )}

        {/* Navigation links */}
        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          <DashboardSidebarLinks isStaff={isStaff} />
        </div>

        {/* User profile footer */}
        <div className="border-t border-white/[0.05] p-3">
          {user && (
            <UserMenu
              name={displayName}
              email={user.email ?? ""}
              isStaff={isStaff}
              role={roleLabel}
              expanded
              planTier={org?.plan_tier ?? undefined}
            />
          )}
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <DashboardMobileNav isStaff={isStaff} />
    </>
  );
}
