import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return Response.json({ error: "You are not on a team." }, { status: 400 });
  }

  if (profile.role === "captain") {
    const { count: captainCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("org_id", profile.org_id)
      .eq("role", "captain");

    if ((captainCount ?? 0) <= 1) {
      // Check if there are other members
      const { count: totalMembers } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", profile.org_id);

      if ((totalMembers ?? 0) <= 1) {
        return Response.json(
          {
            error:
              "You are the only member of your team. Delete the team instead of leaving.",
          },
          { status: 400 }
        );
      }

      return Response.json(
        {
          error:
            "You are the only captain. Promote another member to captain before leaving.",
        },
        { status: 400 }
      );
    }
  }

  return Response.json({ eligible: true });
}
