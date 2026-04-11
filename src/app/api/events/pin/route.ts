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
    return NextResponse.json({ error: "Only captains can pin events" }, { status: 403 });
  }

  const { orgEventId, pin } = await request.json();

  if (!orgEventId || typeof pin !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Unpin all events for this org first
  await supabase
    .from("org_events")
    .update({ is_pinned: false })
    .eq("org_id", profile.org_id);

  // Pin the target event if pin=true
  if (pin) {
    const { error } = await supabase
      .from("org_events")
      .update({ is_pinned: true })
      .eq("id", orgEventId)
      .eq("org_id", profile.org_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
