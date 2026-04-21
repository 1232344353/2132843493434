import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";
import { NotificationsButton } from "@/components/notifications-button";
import {
  DashboardSidebarLinks,
  DashboardMobileNav,
  SidebarCloseButton,
  SidebarParticles,
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

  const teamNumber = org?.team_number ?? null;
  const teamName = org?.name ?? null;
  const teamLabel = teamNumber ? `Team ${teamNumber}` : teamName ?? "My Team";

  const isStaff = profile?.is_staff === true;
  const displayName = profile?.display_name ?? user?.email ?? "Account";
  const roleLabel = (profile?.role as string | null | undefined) ?? "Member";

  return (
    <>
    <DashboardMobileNav isStaff={isStaff} />
    <div className="relative flex h-full w-64 flex-col">
      <SidebarParticles />
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="font-outfit text-base font-bold tracking-tight text-white"
        >
          Pit<span className="text-teal-400">Pilot</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationsButton />
          <SidebarCloseButton />
        </div>
      </div>

      {/* ── Team name row ── */}
      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-white/[0.04]">
        <span className="flex-1 truncate text-sm font-medium text-gray-200">{teamLabel}</span>
        <Link
          href="/changelog"
          className="text-[9px] font-medium text-gray-600 transition hover:text-gray-400"
          title="View changelog"
        >
          v2.1.3
        </Link>
      </div>

      {/* Announcement banner */}
      {announcement?.message && (
        <div
          className={`mx-3 mb-2 rounded-lg border px-3 py-2 text-xs font-medium ${BANNER_STYLES[announcement.variant] ?? BANNER_STYLES.info}`}
        >
          {announcement.message}
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        <DashboardSidebarLinks isStaff={isStaff} />
      </div>

      {/* ── User footer ── */}
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
    </div>
    </>
  );
}
