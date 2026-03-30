"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeScoutingFormConfig,
  normalizePitScoutFormConfig,
  normalizeScoutingAbilityQuestions,
  type ScoutingFormConfig,
  type PitScoutFormConfig,
} from "@/lib/platform-settings";
import { getEventFormConfigRow, getTemplateEventFormConfig } from "@/lib/event-form-config";

async function requireCaptain() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" } as const;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return { error: "Profile not found" } as const;
  if (profile.role !== "captain") return { error: "Captain access required" } as const;
  if (!profile.org_id) return { error: "Organization not found" } as const;

  return { supabase, profile, user } as const;
}

export async function saveEventFormConfig(formData: FormData) {
  const ctx = await requireCaptain();
  if ("error" in ctx) return ctx;

  const eventKey = (formData.get("eventKey") as string | null)?.trim();
  if (!eventKey) return { error: "Missing event key" } as const;

  const questionsJson = formData.get("questionsJson") as string | null;
  const formConfigJson = formData.get("formConfigJson") as string | null;
  const pitScoutConfigJson = formData.get("pitScoutConfigJson") as string | null;

  let questions: string[] | undefined;
  let formConfig: ScoutingFormConfig | undefined;
  let pitScoutConfig: PitScoutFormConfig | undefined;

  try {
    if (questionsJson) questions = normalizeScoutingAbilityQuestions(JSON.parse(questionsJson));
    if (formConfigJson) formConfig = normalizeScoutingFormConfig(JSON.parse(formConfigJson));
    if (pitScoutConfigJson) pitScoutConfig = normalizePitScoutFormConfig(JSON.parse(pitScoutConfigJson));
  } catch {
    return { error: "Invalid config data" } as const;
  }

  const [existing, template] = await Promise.all([
    getEventFormConfigRow(ctx.supabase, ctx.profile.org_id!, eventKey),
    getTemplateEventFormConfig(ctx.supabase),
  ]);

  const now = new Date().toISOString();

  const { error } = await ctx.supabase
    .from("event_form_configs")
    .upsert(
      {
        org_id: ctx.profile.org_id!,
        event_key: eventKey,
        questions: (questions ?? existing?.questions ?? template.questions) as unknown as import("@/types/supabase").Json,
        form_config: (formConfig ?? existing?.formConfig ?? template.formConfig) as unknown as import("@/types/supabase").Json,
        pit_scout_config: (pitScoutConfig ?? existing?.pitScoutConfig ?? template.pitScoutConfig) as unknown as import("@/types/supabase").Json,
        updated_at: now,
      },
      { onConflict: "org_id,event_key" }
    );

  if (error) return { error: error.message } as const;

  revalidatePath(`/dashboard/events/${eventKey}`);
  revalidatePath(`/dashboard/events/${eventKey}/customize`);
  return { success: true } as const;
}

export async function copyEventFormConfig(formData: FormData) {
  const ctx = await requireCaptain();
  if ("error" in ctx) return ctx;

  const fromEventKey = (formData.get("fromEventKey") as string | null)?.trim();
  const toEventKey = (formData.get("toEventKey") as string | null)?.trim();

  if (!fromEventKey || !toEventKey) return { error: "Missing event keys" } as const;
  if (fromEventKey === toEventKey) return { error: "Cannot copy to the same event" } as const;

  const source = await getEventFormConfigRow(ctx.supabase, ctx.profile.org_id!, fromEventKey);
  if (!source) return { error: "No custom config found for the source event" } as const;

  const now = new Date().toISOString();

  const { error } = await ctx.supabase
    .from("event_form_configs")
    .upsert(
      {
        org_id: ctx.profile.org_id!,
        event_key: toEventKey,
        questions: source.questions as unknown as import("@/types/supabase").Json,
        form_config: source.formConfig as unknown as import("@/types/supabase").Json,
        pit_scout_config: source.pitScoutConfig as unknown as import("@/types/supabase").Json,
        updated_at: now,
      },
      { onConflict: "org_id,event_key" }
    );

  if (error) return { error: error.message } as const;

  revalidatePath(`/dashboard/events/${toEventKey}/customize`);
  return { success: true } as const;
}

export async function resetEventFormConfig(formData: FormData) {
  const ctx = await requireCaptain();
  if ("error" in ctx) return ctx;

  const eventKey = (formData.get("eventKey") as string | null)?.trim();
  if (!eventKey) return { error: "Missing event key" } as const;

  const { error } = await ctx.supabase
    .from("event_form_configs")
    .delete()
    .eq("org_id", ctx.profile.org_id!)
    .eq("event_key", eventKey);

  if (error) return { error: error.message } as const;

  revalidatePath(`/dashboard/events/${eventKey}`);
  revalidatePath(`/dashboard/events/${eventKey}/customize`);
  return { success: true } as const;
}

export async function resetMatchEventFormConfig(formData: FormData) {
  const ctx = await requireCaptain();
  if ("error" in ctx) return ctx;

  const eventKey = (formData.get("eventKey") as string | null)?.trim();
  if (!eventKey) return { error: "Missing event key" } as const;

  const [existing, template] = await Promise.all([
    getEventFormConfigRow(ctx.supabase, ctx.profile.org_id!, eventKey),
    getTemplateEventFormConfig(ctx.supabase),
  ]);

  const now = new Date().toISOString();

  const { error } = await ctx.supabase
    .from("event_form_configs")
    .upsert(
      {
        org_id: ctx.profile.org_id!,
        event_key: eventKey,
        questions: template.questions as unknown as import("@/types/supabase").Json,
        form_config: template.formConfig as unknown as import("@/types/supabase").Json,
        pit_scout_config: (existing?.pitScoutConfig ?? template.pitScoutConfig) as unknown as import("@/types/supabase").Json,
        updated_at: now,
      },
      { onConflict: "org_id,event_key" }
    );

  if (error) return { error: error.message } as const;

  revalidatePath(`/dashboard/events/${eventKey}`);
  revalidatePath(`/dashboard/events/${eventKey}/customize`);
  return { success: true } as const;
}

export async function resetPitEventFormConfig(formData: FormData) {
  const ctx = await requireCaptain();
  if ("error" in ctx) return ctx;

  const eventKey = (formData.get("eventKey") as string | null)?.trim();
  if (!eventKey) return { error: "Missing event key" } as const;

  const [existing, template] = await Promise.all([
    getEventFormConfigRow(ctx.supabase, ctx.profile.org_id!, eventKey),
    getTemplateEventFormConfig(ctx.supabase),
  ]);

  const now = new Date().toISOString();

  const { error } = await ctx.supabase
    .from("event_form_configs")
    .upsert(
      {
        org_id: ctx.profile.org_id!,
        event_key: eventKey,
        questions: (existing?.questions ?? template.questions) as unknown as import("@/types/supabase").Json,
        form_config: (existing?.formConfig ?? template.formConfig) as unknown as import("@/types/supabase").Json,
        pit_scout_config: template.pitScoutConfig as unknown as import("@/types/supabase").Json,
        updated_at: now,
      },
      { onConflict: "org_id,event_key" }
    );

  if (error) return { error: error.message } as const;

  revalidatePath(`/dashboard/events/${eventKey}`);
  revalidatePath(`/dashboard/events/${eventKey}/customize`);
  return { success: true } as const;
}
