import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  getDefaultScoutingFormConfig,
  getDefaultPitScoutFormConfig,
  getDefaultScoutingAbilityQuestions,
  normalizeScoutingFormConfig,
  normalizePitScoutFormConfig,
  normalizeScoutingAbilityQuestions,
  type ScoutingFormConfig,
  type PitScoutFormConfig,
} from "@/lib/platform-settings";

export interface EventFormConfig {
  questions: string[];
  formConfig: ScoutingFormConfig;
  pitScoutConfig: PitScoutFormConfig;
}

export interface EventFormCopySource {
  eventKey: string;
  label: string;
}

export async function getTemplateEventFormConfig(
  supabase: SupabaseClient<Database>
): Promise<EventFormConfig> {
  const { data } = await supabase
    .from("platform_settings")
    .select("scouting_ability_questions")
    .eq("id", 1)
    .maybeSingle();

  if (!data?.scouting_ability_questions) {
    return {
      questions: getDefaultScoutingAbilityQuestions(),
      formConfig: getDefaultScoutingFormConfig(),
      pitScoutConfig: getDefaultPitScoutFormConfig(),
    };
  }

  const payload = data.scouting_ability_questions as Record<string, unknown>;
  return {
    questions: normalizeScoutingAbilityQuestions(
      payload.questions ?? payload.scoutingAbilityQuestions
    ),
    formConfig: normalizeScoutingFormConfig(
      payload.formConfig ?? payload.form_config
    ),
    pitScoutConfig: normalizePitScoutFormConfig(
      payload.pitScoutConfig ?? payload.pit_scout_config
    ),
  };
}

/**
 * Fetch the event-specific form config row for an org+event.
 * Returns null if no custom config has been saved yet.
 */
export async function getEventFormConfigRow(
  supabase: SupabaseClient<Database>,
  orgId: string,
  eventKey: string
): Promise<EventFormConfig | null> {
  const { data, error } = await supabase
    .from("event_form_configs")
    .select("questions, form_config, pit_scout_config")
    .eq("org_id", orgId)
    .eq("event_key", eventKey)
    .maybeSingle();

  if (error || !data) return null;

  return {
    questions: normalizeScoutingAbilityQuestions(data.questions),
    formConfig: normalizeScoutingFormConfig(data.form_config),
    pitScoutConfig: normalizePitScoutFormConfig(data.pit_scout_config),
  };
}

/**
 * Returns the effective config for an event: event-specific if saved,
 * otherwise the global platform_settings template.
 */
export async function getEffectiveEventFormConfig(
  supabase: SupabaseClient<Database>,
  orgId: string,
  eventKey: string
): Promise<EventFormConfig> {
  const eventConfig = await getEventFormConfigRow(supabase, orgId, eventKey);
  if (eventConfig) return eventConfig;
  return getTemplateEventFormConfig(supabase);
}

/**
 * List all event keys that have a saved custom config for an org,
 * excluding the given event key (used for "copy from" UI).
 */
export async function getOtherCustomizedEvents(
  supabase: SupabaseClient<Database>,
  orgId: string,
  excludeEventKey: string
): Promise<EventFormCopySource[]> {
  const { data } = await supabase
    .from("event_form_configs")
    .select("event_key, updated_at")
    .eq("org_id", orgId)
    .neq("event_key", excludeEventKey)
    .order("updated_at", { ascending: false });

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const eventKeys = rows.map((row) => row.event_key);
  const { data: events } = await supabase
    .from("events")
    .select("tba_key, name, year")
    .in("tba_key", eventKeys);

  const eventMap = new Map(
    (events ?? []).map((event) => [
      event.tba_key,
      event.year ? `${event.year} ${event.name}` : event.name,
    ])
  );

  return rows.map((row) => ({
    eventKey: row.event_key,
    label: eventMap.get(row.event_key) ?? row.event_key,
  }));
}
