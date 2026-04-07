"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteAllScoutingReports() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return { error: "No organization found." } as const;
  }

  if (profile.role !== "captain") {
    return { error: "Only captains can delete scouting reports." } as const;
  }

  // Use admin client to bypass RLS — authorization is enforced above.
  const admin = createAdminClient();
  const { error } = await admin
    .from("scouting_entries")
    .delete()
    .eq("org_id", profile.org_id);

  if (error) {
    return { error: error.message } as const;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
  return { success: true } as const;
}

export async function deleteScoutingReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" } as const;
  }

  const reportId = (formData.get("reportId") as string | null)?.trim();
  if (!reportId) {
    return { error: "Missing report id" } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return { error: "No organization found." } as const;
  }

  // Fetch the entry first to verify it belongs to this org and check authorship.
  const { data: entry } = await supabase
    .from("scouting_entries")
    .select("id, scouted_by, org_id")
    .eq("id", reportId)
    .single();

  if (!entry) {
    return { error: "Report not found." } as const;
  }

  if (entry.org_id !== profile.org_id) {
    return { error: "Not authorized." } as const;
  }

  const isOwner = entry.scouted_by === user.id;
  const isCaptain = profile.role === "captain";

  if (!isOwner && !isCaptain) {
    return { error: "Only captains can delete other scouts' reports." } as const;
  }

  // Use admin client to bypass RLS — authorization is enforced above.
  // This allows captains to remove reports from scouts who have since left the team.
  const admin = createAdminClient();
  const { error } = await admin
    .from("scouting_entries")
    .delete()
    .eq("id", reportId)
    .eq("org_id", profile.org_id);

  if (error) {
    return { error: error.message } as const;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
  return { success: true } as const;
}
