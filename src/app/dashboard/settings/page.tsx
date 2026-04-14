import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TeamSettingsForm } from "./settings-form";
import { getOrgBillingOverview } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Settings | PitPilot",
  description: "Manage your PitPilot team settings, join codes, and member roles.",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    redirect("/join");
  }

  const org = profile.organizations;

  // Get member count
  const { count: memberCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("org_id", profile.org_id);

  const { data: members } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: true });

  const billingOverview =
    profile.role === "captain" ? await getOrgBillingOverview(profile.org_id) : null;

  return (
    <div className="min-h-screen dashboard-page">
      <main className="mx-auto max-w-4xl px-6 pb-12 pt-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
              Settings
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">Team settings</h1>
            <p className="mt-2 text-sm text-gray-300">
              Manage organization details, join codes, and member roles.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/settings/account"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/5 hover:border-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Account
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-white/20 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </Link>
          </div>
        </div>

        <TeamSettingsForm
          org={{
            name: org?.name ?? "",
            teamNumber: org?.team_number ?? null,
            joinCode: org?.join_code ?? "",
            planTier:
              (org?.plan_tier as "free" | "supporter" | "gifted_supporter" | undefined) ??
              "free",
          }}
          billingOverview={billingOverview}
          memberCount={memberCount ?? 0}
          isCaptain={profile.role === "captain"}
          currentUserId={user.id}
          members={members ?? []}
        />
      </main>
    </div>
  );
}
