import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveEventFormConfig, getOtherCustomizedEvents } from "@/lib/event-form-config";
import { EventCustomizeForm } from "./customize-form";
import { ImportFormButton } from "./import-form-button";
import { CustomizeTour } from "./customize-tour";

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
      <CustomizeTour />
      <main className="mx-auto max-w-3xl px-6 pb-16 pt-10">

        {/* Header card */}
        <div data-tour="customize-header" className="mb-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                  {eventTitle}
                </p>
                <h1 className="mt-2 text-2xl font-bold text-white">Form Setup</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Customize the scouting form for your scouts at this event. Starts from the global template.
                </p>
              </div>
              <Link
                href={`/dashboard/events/${eventKey}`}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:border-white/20 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </Link>
            </div>

            <div data-tour="customize-actions" className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-4">
              <ImportFormButton eventKey={eventKey} sources={importSources} />
            </div>
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
