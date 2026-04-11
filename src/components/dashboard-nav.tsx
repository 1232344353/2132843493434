import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";
import { DashboardNavLinks } from "@/components/dashboard-nav-links";

const BANNER_STYLES: Record<string, string> = {
  info: "border-teal-500/30 bg-teal-500/10 text-teal-100",
  success: "border-green-500/30 bg-green-500/10 text-green-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  danger: "border-red-500/30 bg-red-500/10 text-red-100",
};

export async function DashboardNav() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name, is_staff, org_id, organizations(team_number, name)")
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
    | { team_number: number | null; name: string | null }
    | null
    | undefined;
  const teamLabel = org?.team_number
    ? `Team ${org.team_number}`
    : org?.name ?? null;

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#06080f]/85 backdrop-blur-2xl">
      {announcement?.message && (
        <div
          className={`border-b px-4 py-1.5 text-center text-xs font-medium ${BANNER_STYLES[announcement.variant] ?? BANNER_STYLES.info}`}
        >
          {announcement.message}
        </div>
      )}
      <div className="flex h-14 items-center gap-3 px-4">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="font-outfit shrink-0 text-base font-bold tracking-tight text-white"
        >
          Pit<span className="text-teal-400">Pilot</span>
        </Link>

        {/* Divider */}
        <div className="hidden h-4 w-px shrink-0 bg-white/10 sm:block" aria-hidden="true" />

        {/* Nav links */}
        <DashboardNavLinks />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side: team badge + user menu */}
        <div className="flex items-center gap-2.5">
          {teamLabel && (
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-gray-300 sm:flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {teamLabel}
            </span>
          )}
          {user && (
            <UserMenu
              name={profile?.display_name ?? user.email ?? "Account"}
              email={user.email ?? ""}
              isStaff={profile?.is_staff === true}
            />
          )}
        </div>
      </div>
    </header>
  );
}
