"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/toast";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { CounterButton } from "@/components/counter-button";
import { PIT_SECTION_IDS, type PitScoutFormConfig, type PitSectionId, type CustomSection, type CustomFieldDef } from "@/lib/platform-settings";
import { savePitOffline, buildPitEntryKey, hasPendingPitEntry } from "@/lib/offline-queue";

interface PitScoutButtonProps {
  eventId: string;
  teamNumber: number;
  orgId: string;
  userId: string;
  scoutName: string;
  config: PitScoutFormConfig;
}

const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-500";
const LEGEND = "text-sm font-medium text-gray-300 mb-2";
const INPUT =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-teal-500/50 focus:outline-none";
const TEXTAREA = `${INPUT} resize-none`;

const PIT_SECTION_META: Record<PitSectionId, { title: string; accent: string }> = {
  build: { title: "Robot Build", accent: "text-cyan-300" },
  scoring: { title: "Scoring", accent: "text-emerald-300" },
  endgame: { title: "Endgame", accent: "text-purple-300" },
  auto_notes: { title: "Auto & Notes", accent: "text-teal-300" },
};

function isPitSectionId(value: string): value is PitSectionId {
  return PIT_SECTION_IDS.includes(value as PitSectionId);
}

type CustomFieldValue = string | number | boolean | string[];

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseCustomData(
  value: unknown,
  sections: CustomSection[]
): Record<string, CustomFieldValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const parsed: Record<string, CustomFieldValue> = {};

  for (const section of sections) {
    for (const field of section.fields) {
      const fieldValue = raw[field.id];
      switch (field.type) {
        case "counter": {
          if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue)) break;
          parsed[field.id] = clampNumber(Math.trunc(fieldValue), field.min ?? 0, field.max ?? 99);
          break;
        }
        case "toggle": {
          if (typeof fieldValue === "boolean") parsed[field.id] = fieldValue;
          break;
        }
        case "multi-select": {
          if (!Array.isArray(fieldValue)) break;
          const allowedKeys = new Set((field.options ?? []).map((option) => option.key));
          const selected = Array.from(
            new Set(
              fieldValue.filter(
                (item): item is string => typeof item === "string" && allowedKeys.has(item)
              )
            )
          );
          if (selected.length > 0) parsed[field.id] = selected;
          break;
        }
        case "rating": {
          if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue)) break;
          parsed[field.id] = clampNumber(Math.trunc(fieldValue), 0, field.maxStars ?? 5);
          break;
        }
        case "text": {
          if (typeof fieldValue === "string") parsed[field.id] = fieldValue;
          break;
        }
      }
    }
  }

  return parsed;
}

function sanitizeCustomData(
  data: Record<string, CustomFieldValue>,
  sections: CustomSection[]
): Record<string, CustomFieldValue> {
  const sanitized: Record<string, CustomFieldValue> = {};

  for (const section of sections) {
    for (const field of section.fields) {
      const fieldValue = data[field.id];
      switch (field.type) {
        case "counter": {
          if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue)) break;
          sanitized[field.id] = clampNumber(Math.trunc(fieldValue), field.min ?? 0, field.max ?? 99);
          break;
        }
        case "toggle": {
          if (typeof fieldValue === "boolean") sanitized[field.id] = fieldValue;
          break;
        }
        case "multi-select": {
          if (!Array.isArray(fieldValue)) break;
          const allowedKeys = new Set((field.options ?? []).map((option) => option.key));
          const selected = Array.from(
            new Set(
              fieldValue.filter(
                (item): item is string => typeof item === "string" && allowedKeys.has(item)
              )
            )
          );
          if (selected.length > 0) sanitized[field.id] = selected;
          break;
        }
        case "rating": {
          if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue)) break;
          const clamped = clampNumber(Math.trunc(fieldValue), 0, field.maxStars ?? 5);
          if (clamped > 0) sanitized[field.id] = clamped;
          break;
        }
        case "text": {
          if (typeof fieldValue !== "string") break;
          const trimmed = fieldValue.trim();
          if (trimmed) sanitized[field.id] = trimmed;
          break;
        }
      }
    }
  }

  return sanitized;
}

function stripUnsupportedPitColumns<T extends Record<string, unknown>>(
  payload: T,
  errorMessage: string
) {
  const next = { ...payload } as Record<string, unknown>;
  const msg = errorMessage.toLowerCase();

  if (msg.includes("custom_data")) {
    delete next.custom_data;
  }

  return next as T;
}

function ToggleButton({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
        selected
          ? "border-teal-500/50 bg-teal-500/15 text-teal-200"
          : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function PitScoutButton({
  eventId,
  teamNumber,
  orgId,
  userId,
  scoutName,
  config,
}: PitScoutButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [hasPending, setHasPending] = useState(false);

  // Form state
  const [drivetrain, setDrivetrain] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [height, setHeight] = useState("");
  const [intakeTypes, setIntakeTypes] = useState<string[]>([]);
  const [scoringRanges, setScoringRanges] = useState<string[]>([]);
  const [estimatedCycles, setEstimatedCycles] = useState("");
  const [climbCapability, setClimbCapability] = useState("");
  const [fuelOutput, setFuelOutput] = useState("");
  const [autoDescription, setAutoDescription] = useState("");
  const [autoFuelScored, setAutoFuelScored] = useState("");
  const [notes, setNotes] = useState("");
  const customSections = useMemo(
    () => config.customSections ?? [],
    [config.customSections]
  );
  const customSectionsById = useMemo(
    () =>
      Object.fromEntries(
        customSections.map((section) => [section.id, section])
      ) as Record<string, CustomSection>,
    [customSections]
  );
  const [customData, setCustomData] = useState<Record<string, CustomFieldValue>>({});
  const customDataPayload = useMemo(
    () => sanitizeCustomData(customData, customSections),
    [customData, customSections]
  );

  const visibleSections = useMemo(() => {
    const hidden = new Set((config.hiddenSections ?? []).filter(isPitSectionId));
    const saved = config.sectionOrder ?? [];
    const customIds = new Set(customSections.map((section) => section.id));
    const ordered = [
      ...saved.filter((id) => isPitSectionId(id) || customIds.has(id)),
      ...PIT_SECTION_IDS.filter((id) => !saved.includes(id)),
      ...customSections.map((section) => section.id).filter((id) => !saved.includes(id)),
    ];
    return ordered.filter((id) => !isPitSectionId(id) || !hidden.has(id));
  }, [config.hiddenSections, config.sectionOrder, customSections]);

  const filledCount = useMemo(() => {
    let count = 0;
    if (visibleSections.includes("build") && (drivetrain || width || length || height)) count++;
    if (visibleSections.includes("scoring") && (intakeTypes.length > 0 || scoringRanges.length > 0 || estimatedCycles || fuelOutput)) count++;
    if (visibleSections.includes("endgame") && climbCapability) count++;
    if (visibleSections.includes("auto_notes") && (autoDescription.trim() || autoFuelScored || notes.trim())) count++;
    for (const sectionId of visibleSections) {
      if (isPitSectionId(sectionId)) continue;
      const section = customSectionsById[sectionId];
      if (!section) continue;
      const hasAnswer = section.fields.some((field) => {
        const value = customDataPayload[field.id];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "string") return value.trim().length > 0;
        if (typeof value === "number") return Number.isFinite(value) && value > 0;
        return typeof value === "boolean";
      });
      if (hasAnswer) count++;
    }
    return count;
  }, [visibleSections, drivetrain, width, length, height, intakeTypes, scoringRanges, estimatedCycles, fuelOutput, climbCapability, autoDescription, autoFuelScored, notes, customSectionsById, customDataPayload]);
  const totalFields = visibleSections.length;
  const progressPercent = totalFields > 0 ? (filledCount / totalFields) * 100 : 0;

  // Check for pending offline entry on mount and whenever the modal closes
  useEffect(() => {
    if (open) return; // only check when closed
    hasPendingPitEntry(orgId, eventId, teamNumber)
      .then(setHasPending)
      .catch(() => {});
  }, [open, orgId, eventId, teamNumber]);

  // Load existing pit scout data when modal opens
  useEffect(() => {
    if (!open) return;

    // Skip the fetch when offline — show a blank/pre-filled form instead
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    let cancelled = false;

    const loadExistingPitScout = async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("pit_scout_entries")
        .select("*")
        .eq("org_id", orgId)
        .eq("event_id", eventId)
        .eq("team_number", teamNumber)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError("Failed to load existing pit scout data.");
        setLoading(false);
        return;
      }

      if (data) {
        setExistingId(data.id);
        setDrivetrain(data.drivetrain ?? "");
        setWidth(data.width_inches?.toString() ?? "");
        setLength(data.length_inches?.toString() ?? "");
        setHeight(data.height_inches?.toString() ?? "");
        const intake = Array.isArray(data.intake_types) ? data.intake_types as string[] : [];
        setIntakeTypes(intake);
        const ranges = Array.isArray(data.scoring_ranges) ? data.scoring_ranges as string[] : [];
        setScoringRanges(ranges);
        setEstimatedCycles(data.estimated_cycles?.toString() ?? "");
        setClimbCapability(data.climb_capability ?? "");
        setFuelOutput(data.fuel_output ?? "");
        setAutoDescription(data.auto_description ?? "");
        setAutoFuelScored(data.auto_fuel_scored?.toString() ?? "");
        setNotes(data.notes ?? "");
        setCustomData(parseCustomData(data.custom_data, customSections));
      }

      setLoading(false);
    };

    void loadExistingPitScout();

    return () => {
      cancelled = true;
    };
  }, [open, orgId, eventId, teamNumber, customSections]);

  const updateCustomFieldValue = (fieldId: string, value: CustomFieldValue | undefined) => {
    setCustomData((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[fieldId];
      else next[fieldId] = value;
      return next;
    });
  };

  const renderCustomField = (field: CustomFieldDef) => {
    const currentValue = customData[field.id];

    switch (field.type) {
      case "counter": {
        const min = field.min ?? 0;
        const max = field.max ?? 99;
        const value =
          typeof currentValue === "number" && Number.isFinite(currentValue)
            ? clampNumber(Math.trunc(currentValue), min, max)
            : min;

        return (
          <div key={field.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <CounterButton
              label={field.label}
              value={value}
              min={min}
              max={max}
              onChange={(next) => updateCustomFieldValue(field.id, next)}
            />
          </div>
        );
      }
      case "toggle": {
        const value = currentValue === true;
        return (
          <div key={field.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-200">{field.label}</span>
              <ToggleButton
                selected={value}
                onClick={() => updateCustomFieldValue(field.id, value ? undefined : true)}
              >
                {value ? "Yes" : "No"}
              </ToggleButton>
            </div>
          </div>
        );
      }
      case "multi-select": {
        const options = field.options ?? [];
        const value = Array.isArray(currentValue) ? currentValue : [];
        return (
          <fieldset key={field.id} className="space-y-2">
            <legend className={LEGEND}>{field.label}</legend>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <ToggleButton
                  key={option.key}
                  selected={value.includes(option.key)}
                  onClick={() => {
                    const next = value.includes(option.key)
                      ? value.filter((item) => item !== option.key)
                      : [...value, option.key];
                    updateCustomFieldValue(field.id, next.length > 0 ? next : undefined);
                  }}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </div>
          </fieldset>
        );
      }
      case "rating": {
        const maxStars = field.maxStars ?? 5;
        const value =
          typeof currentValue === "number" && Number.isFinite(currentValue)
            ? clampNumber(Math.trunc(currentValue), 0, maxStars)
            : 0;
        return (
          <fieldset key={field.id} className="space-y-2">
            <legend className={LEGEND}>{field.label}</legend>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: maxStars }, (_, idx) => idx + 1).map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateCustomFieldValue(field.id, value === star ? undefined : star)}
                  className="text-2xl transition-transform hover:scale-105"
                  aria-label={`${star} of ${maxStars} stars`}
                >
                  <span className={star <= value ? "text-yellow-400" : "text-gray-600"}>&#9733;</span>
                </button>
              ))}
            </div>
          </fieldset>
        );
      }
      case "text": {
        const value = typeof currentValue === "string" ? currentValue : "";
        return (
          <div key={field.id}>
            <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
            <textarea
              value={value}
              onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder ?? "Add notes"}
              rows={3}
              className={TEXTAREA}
            />
          </div>
        );
      }
    }
  };

  const renderSection = (sectionId: string) => {
    if (!isPitSectionId(sectionId)) {
      const section = customSectionsById[sectionId];
      if (!section) return null;

      return (
        <div key={section.id} className="space-y-4 border-t border-white/5 pt-5">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
              {section.title}
            </h3>
            {section.description?.trim() ? (
              <p className="mt-1 text-sm text-gray-400">{section.description}</p>
            ) : null}
          </div>
          <div className="space-y-3">
            {section.fields.map((field) => renderCustomField(field))}
          </div>
        </div>
      );
    }

    const meta = PIT_SECTION_META[sectionId];

    switch (sectionId) {
      case "build":
        return (
          <div key={sectionId} className="space-y-4">
            <h3 className={`${SECTION_LABEL} ${meta.accent}`}>{meta.title}</h3>

            <fieldset>
              <legend className={LEGEND}>Drivetrain</legend>
              <div className="grid grid-cols-2 gap-2">
                {config.drivetrainOptions.map((opt) => (
                  <ToggleButton
                    key={opt}
                    selected={drivetrain === opt}
                    onClick={() => setDrivetrain(drivetrain === opt ? "" : opt)}
                  >
                    {opt}
                  </ToggleButton>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={LEGEND}>Robot Dimensions (inches)</legend>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Width", value: width, setter: setWidth },
                  { label: "Length", value: length, setter: setLength },
                  { label: "Height", value: height, setter: setHeight },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder="0"
                      className={INPUT}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
        );
      case "scoring":
        return (
          <div key={sectionId} className="space-y-4 border-t border-white/5 pt-5">
            <h3 className={`${SECTION_LABEL} ${meta.accent}`}>{meta.title}</h3>

            <fieldset>
              <legend className={LEGEND}>Intake Type</legend>
              <div className="flex gap-2">
                {config.intakeOptions.map((opt) => (
                  <ToggleButton
                    key={opt.key}
                    selected={intakeTypes.includes(opt.key)}
                    onClick={() => toggleArrayValue(intakeTypes, opt.key, setIntakeTypes)}
                    className="flex-1"
                  >
                    {opt.label}
                  </ToggleButton>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={LEGEND}>Scoring Range</legend>
              <div className="flex gap-2 mb-3">
                {config.scoringRangeOptions.map((opt) => (
                  <ToggleButton
                    key={opt.key}
                    selected={scoringRanges.includes(opt.key)}
                    onClick={() => toggleArrayValue(scoringRanges, opt.key, setScoringRanges)}
                    className="flex-1"
                  >
                    {opt.label}
                  </ToggleButton>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Estimated cycles per match</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={estimatedCycles}
                  onChange={(e) => setEstimatedCycles(e.target.value)}
                  placeholder="0"
                  className={`${INPUT} max-w-[120px]`}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className={LEGEND}>Shooter Output</legend>
              <div className="grid grid-cols-3 gap-2">
                {config.fuelOutputOptions.map((opt) => (
                  <ToggleButton
                    key={opt}
                    selected={fuelOutput === opt}
                    onClick={() => setFuelOutput(fuelOutput === opt ? "" : opt)}
                  >
                    {opt}
                  </ToggleButton>
                ))}
              </div>
            </fieldset>
          </div>
        );
      case "endgame":
        return (
          <div key={sectionId} className="space-y-4 border-t border-white/5 pt-5">
            <h3 className={`${SECTION_LABEL} ${meta.accent}`}>{meta.title}</h3>

            <fieldset>
              <legend className={LEGEND}>Climb Capability</legend>
              <div className="grid grid-cols-4 gap-2">
                {config.climbOptions.map((opt) => (
                  <ToggleButton
                    key={opt}
                    selected={climbCapability === opt}
                    onClick={() => setClimbCapability(climbCapability === opt ? "" : opt)}
                  >
                    {opt}
                  </ToggleButton>
                ))}
              </div>
            </fieldset>
          </div>
        );
      case "auto_notes":
        return (
          <div key={sectionId} className="space-y-4 border-t border-white/5 pt-5">
            <h3 className={`${SECTION_LABEL} ${meta.accent}`}>{meta.title}</h3>

            <fieldset>
              <legend className={LEGEND}>Auto Routine</legend>
              <textarea
                value={autoDescription}
                onChange={(e) => setAutoDescription(e.target.value)}
                placeholder="What does their auto do?"
                rows={2}
                className={TEXTAREA}
              />
              <div className="mt-2">
                <label className="block text-xs text-gray-400 mb-1">FUEL scored in auto</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={autoFuelScored}
                  onChange={(e) => setAutoFuelScored(e.target.value)}
                  placeholder="0"
                  className={`${INPUT} max-w-[120px]`}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className={LEGEND}>What stood out about this team?</legend>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Build quality, driver skill, strategy preferences, known issues..."
                rows={3}
                className={TEXTAREA}
              />
            </fieldset>
          </div>
        );
    }
  };

  function toggleArrayValue(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    setSavedOffline(false);

    const entry = {
      org_id: orgId,
      scouted_by: userId,
      event_id: eventId,
      team_number: teamNumber,
      drivetrain: drivetrain || null,
      width_inches: width ? parseFloat(width) : null,
      length_inches: length ? parseFloat(length) : null,
      height_inches: height ? parseFloat(height) : null,
      intake_types: intakeTypes.length > 0 ? intakeTypes : null,
      scoring_ranges: scoringRanges.length > 0 ? scoringRanges : null,
      estimated_cycles: estimatedCycles ? parseInt(estimatedCycles, 10) : null,
      climb_capability: climbCapability || null,
      fuel_output: fuelOutput || null,
      auto_description: autoDescription.trim() || null,
      auto_fuel_scored: autoFuelScored ? parseInt(autoFuelScored, 10) : null,
      notes: notes.trim() || null,
      custom_data: Object.keys(customDataPayload).length > 0 ? customDataPayload : null,
    };

    // Offline path: save to IndexedDB queue
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        await savePitOffline({
          ...entry,
          id: buildPitEntryKey(orgId, eventId, teamNumber),
          created_at: new Date().toISOString(),
        });
        setSaving(false);
        setSavedOffline(true);
        setHasPending(true);
        toast(`Pit scout saved offline for team ${teamNumber}.`, "info");
        setTimeout(() => setOpen(false), 1800);
      } catch {
        toast("Failed to save offline. Please try again.", "error");
        setSaving(false);
      }
      return;
    }

    // Online path: save directly to Supabase
    const supabase = createClient();
    let payload = { ...entry };
    let result: { error: { message: string } | null } = { error: null };
    let attempts = 0;

    while (attempts < 3) {
      result = existingId
        ? await supabase.from("pit_scout_entries").update(payload).eq("id", existingId)
        : await supabase.from("pit_scout_entries").upsert(payload, {
            onConflict: "org_id,event_id,team_number",
          });

      if (!result.error) break;

      const nextPayload = stripUnsupportedPitColumns(payload, result.error.message);
      const changed = Object.keys(nextPayload).length < Object.keys(payload).length;
      if (!changed) break;
      payload = nextPayload;
      attempts += 1;
    }

    if (result.error) {
      toast(result.error.message, "error");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    toast(`Pit scout saved for team ${teamNumber}.`, "success");
    setTimeout(() => setOpen(false), 1200);
  }

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (typeof document === "undefined") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-200 transition hover:bg-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z" />
        </svg>
        Pit Scout
        {hasPending && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-[#0a1020]" aria-label="Pending sync" />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-[999] flex items-center justify-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <motion.div
                className="fixed inset-0 bg-black/65 backdrop-blur-md"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 360, damping: 28, mass: 0.8 }}
                className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-white/15 bg-[#0a1020] shadow-[0_18px_80px_rgba(0,0,0,0.6)] flex flex-col"
              >
                {/* Header */}
                <div className="border-b border-white/10 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        Pit Scout: Team {teamNumber}
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {filledCount}/{totalFields} sections filled
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Body */}
                <div data-lenis-prevent className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-teal-400" />
                    </div>
                  ) : (
                    <>
                      {error && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                          {error}
                        </div>
                      )}
                      {visibleSections.length > 0 ? (
                        visibleSections.map((sectionId) => renderSection(sectionId))
                      ) : (
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
                          All pit sections are currently hidden for this event. Re-enable sections from Form Customization to collect pit data.
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                {!loading && (
                  <div className="border-t border-white/10 px-6 py-3.5 flex items-center gap-3">
                    <p className="text-xs text-gray-500 mr-auto truncate">
                      Scouting as {scoutName}
                    </p>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-white/15 bg-white/[0.02] px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/8"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || saved || savedOffline}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${
                        saved
                          ? "bg-green-600 text-white"
                          : savedOffline
                          ? "bg-amber-600 text-white"
                          : "bg-teal-500 hover:bg-teal-400 text-white"
                      }`}
                    >
                      {saved ? (
                        <>
                          <motion.svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          >
                            <motion.path
                              d="M20 6 9 17l-5-5"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.3, delay: 0.1 }}
                            />
                          </motion.svg>
                          Saved!
                        </>
                      ) : savedOffline ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                          Saved offline
                        </>
                      ) : saving ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving...
                        </>
                      ) : existingId ? "Update" : "Save"}
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
