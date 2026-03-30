import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { getEffectiveEventFormConfig, getOtherCustomizedEvents } from "@/lib/event-form-config";
import { EventCustomizeForm } from "./customize-form";
import { ImportFormButton } from "./import-form-button";

export default async function EventCustomizePage({
  params,
}: {
  params: Promise<{ eventKey: string }>;
}) {
  const { eventKey } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "captain") redirect(`/dashboard/events/${eventKey}`);
  if (!profile?.org_id) redirect("/join");

  const { data: event } = await supabase
    .from("events")
    .select("name, year")
    .eq("tba_key", eventKey)
    .single();

  const [config, importSources] = await Promise.all([
    getEffectiveEventFormConfig(supabase, profile.org_id, eventKey),
    getOtherCustomizedEvents(supabase, profile.org_id, eventKey),
  ]);

  const eventTitle = event
    ? event.year
      ? `${event.year} ${event.name}`
      : event.name
    : eventKey;

  return (
    <div className="min-h-screen dashboard-page">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-32">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
              Form customization
            </p>
            <h1 className="mt-2 text-2xl font-bold">{eventTitle}</h1>
            <p className="mt-1 text-sm text-gray-400">
              Customize the scouting form for your scouts at this event. Starts from the global template.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3 md:justify-end">
            <ImportFormButton eventKey={eventKey} sources={importSources} />
            <Link
              href={`/dashboard/events/${eventKey}`}
              className="back-button"
            >
              Back
            </Link>
          </div>
        </div>

        <EventCustomizeForm
          eventKey={eventKey}
          initialConfig={config}
        />
      </main>
    </div>
  );
}
