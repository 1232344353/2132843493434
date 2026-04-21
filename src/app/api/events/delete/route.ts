import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  if (profile.role !== "captain") {
    return NextResponse.json({ error: "Only captains can delete events" }, { status: 403 });
  }

  const { orgEventId } = await request.json();

  if (!orgEventId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify the org_event belongs to the user's organization
  const { data: orgEvent } = await supabase
    .from("org_events")
    .select("org_id")
    .eq("id", orgEventId)
    .eq("org_id", profile.org_id)
    .single();

  if (!orgEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Delete the org_event (permanently unload/delete the event for this org)
  const { error } = await supabase
    .from("org_events")
    .delete()
    .eq("id", orgEventId)
    .eq("org_id", profile.org_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
