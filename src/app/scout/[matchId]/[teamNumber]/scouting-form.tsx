"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CounterButton } from "@/components/counter-button";
import { StarRating } from "@/components/star-rating";
import { saveOffline, getPendingCount } from "@/lib/offline-queue";
import {
  saveDraft,
  getDraft,
  removeDraft,
  buildDraftKey,
  DRAFT_SCHEMA_VERSION,
  type DraftFormData,
} from "@/lib/offline-drafts";
import type { Tables } from "@/types/supabase";
import { DEFAULT_SECTION_IDS, type CustomFieldDef, type CustomSection, type DefaultSectionId, type ScoutingFormConfig } from "@/lib/platform-settings";

interface ScoutingFormProps {
  matchId: string;
  teamNumber: number;
  orgId: string;
  userId: string;
  eventKey?: string | null;
  abilityQuestions: string[];
  formConfig: ScoutingFormConfig;
  existing: Tables<"scouting_entries"> | null;
}

function parseAbilityAnswers(
  value: Tables<"scouting_entries">["ability_answers"] | null | undefined
): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const parsed: Record<string, boolean> = {};
  for (const [key, answer] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key !== "string") continue;
    if (typeof answer !== "boolean") continue;
    parsed[key] = answer;
  }

  return parsed;
}

type CustomFieldValue = string | number | boolean | string[];

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseCustomData(
  value: Tables<"scouting_entries">["custom_data"] | null | undefined,
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
          parsed[field.id] = clampNumber(
            Math.trunc(fieldValue),
            field.min ?? 0,
            field.max ?? 99
          );
          break;
        }
        case "toggle": {
          if (typeof fieldValue === "boolean") parsed[field.id] = fieldValue;
          break;
        }
        case "multi-select": {
          const allowedKeys = new Set((field.options ?? []).map((option) => option.key));
          if (!Array.isArray(fieldValue)) break;
          const selected = Array.from(
            new Set(
              fieldValue.filter(
                (item): item is string =>
                  typeof item === "string" && allowedKeys.has(item)
              )
            )
          );
          if (selected.length > 0) parsed[field.id] = selected;
          break;
        }
        case "rating": {
          if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue)) break;
          parsed[field.id] = clampNumber(
            Math.trunc(fieldValue),
            0,
            field.maxStars ?? 5
          );
          break;
        }
        case "text": {
          if (typeof fieldValue !== "string") break;
          parsed[field.id] = fieldValue;
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
          sanitized[field.id] = clampNumber(
            Math.trunc(fieldValue),
            field.min ?? 0,
            field.max ?? 99
          );
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
                (item): item is string =>
                  typeof item === "string" && allowedKeys.has(item)
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

function isDefaultSectionId(value: string): value is DefaultSectionId {
  return DEFAULT_SECTION_IDS.includes(value as DefaultSectionId);
}

function parseStringArray(
  value: unknown,
  allowedKeys: Set<string>
): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && allowedKeys.has(item)
      )
    )
  );
}

function parseStringArrayWithFallback(
  arrayValue: unknown,
  singleValue: unknown,
  allowedKeys: Set<string>
): string[] {
  const result = parseStringArray(arrayValue, allowedKeys);
  if (result.length > 0) return result;

  if (typeof singleValue === "string" && allowedKeys.has(singleValue)) {
    return [singleValue];
  }

  return [];
}


function stripUnsupportedScoutingColumns<T extends Record<string, unknown>>(
  payload: T,
  errorMessage: string
) {
  const next = { ...payload } as Record<string, unknown>;
  const msg = errorMessage.toLowerCase();

  if (msg.includes("ability_answers")) {
    delete next.ability_answers;
  }

  if (msg.includes("intake_methods")) {
    delete next.intake_methods;
  }

  if (msg.includes("shooting_ranges")) {
    delete next.shooting_ranges;
  }

  if (msg.includes("climb_levels")) {
    delete next.climb_levels;
  }

  return next as T;
}

export function ScoutingForm({
  matchId,
  teamNumber,
  orgId,
  userId,
  eventKey,
  abilityQuestions,
  formConfig,
  existing,
}: ScoutingFormProps) {
  const router = useRouter();
  const supabase = createClient();

  // Build allowed key sets from config
  const intakeKeys = useMemo(() => new Set(formConfig.intakeOptions.map((o) => o.key)), [formConfig.intakeOptions]);
  const climbKeys = useMemo(() => new Set(formConfig.climbLevelOptions.map((o) => o.key)), [formConfig.climbLevelOptions]);
  const shootingKeys = useMemo(() => new Set(formConfig.shootingRangeOptions.map((o) => o.key)), [formConfig.shootingRangeOptions]);
  const startPositionSet = useMemo(() => new Set(formConfig.autoStartPositions), [formConfig.autoStartPositions]);
  const customSections = useMemo(
    () => formConfig.customSections ?? [],
    [formConfig.customSections]
  );
  const hiddenSectionIds = useMemo(
    () => new Set((formConfig.hiddenSections ?? []).filter(isDefaultSectionId)),
    [formConfig.hiddenSections]
  );
  const orderedSectionIds = useMemo(() => {
    const customIds = new Set(customSections.map((section) => section.id));
    const savedOrder = formConfig.sectionOrder ?? [];
    const ordered = savedOrder.filter(
      (id) => isDefaultSectionId(id) || customIds.has(id)
    );

    for (const id of DEFAULT_SECTION_IDS) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    for (const section of customSections) {
      if (!ordered.includes(section.id)) ordered.push(section.id);
    }

    return ordered.filter((id) => {
      if (isDefaultSectionId(id)) {
        if (hiddenSectionIds.has(id)) return false;
        if (id === "abilities") return abilityQuestions.length > 0;
        return true;
      }
      return customIds.has(id);
    });
  }, [
    abilityQuestions.length,
    customSections,
    formConfig.sectionOrder,
    hiddenSectionIds,
  ]);
  const customSectionsById = useMemo(
    () =>
      Object.fromEntries(
        customSections.map((section) => [section.id, section])
      ) as Record<string, CustomSection>,
    [customSections]
  );

  const [autoScore, setAutoScore] = useState(existing?.auto_score ?? 0);
  const [autoStartPosition, setAutoStartPosition] = useState<string | null>(
    () => {
      const value = existing?.auto_start_position;
      return typeof value === "string" && startPositionSet.has(value)
        ? value
        : null;
    }
  );
  const [shootingRanges, setShootingRanges] = useState<string[]>(() =>
    parseStringArrayWithFallback(existing?.shooting_ranges, existing?.shooting_range, shootingKeys)
  );
  const [autoNotes, setAutoNotes] = useState(existing?.auto_notes ?? "");
  const [teleopScore, setTeleopScore] = useState(existing?.teleop_score ?? 0);
  const [intakeMethods, setIntakeMethods] = useState<string[]>(() =>
    parseStringArray(existing?.intake_methods, intakeKeys)
  );
  const [endgameScore, setEndgameScore] = useState(
    existing?.endgame_score ?? 0
  );
  const [climbLevels, setClimbLevels] = useState<string[]>(() =>
    parseStringArrayWithFallback(existing?.climb_levels, existing?.endgame_state, climbKeys)
  );
  // Dynamic ratings: keyed by field.key, initialized from ratings JSON or legacy columns
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const savedRatings = (existing as Record<string, unknown> | null)?.ratings as Record<string, number> | null | undefined;
    const init: Record<string, number> = {};
    for (const field of formConfig.ratingFields) {
      if (savedRatings && typeof savedRatings[field.key] === "number") {
        init[field.key] = savedRatings[field.key];
      } else {
        // fall back to legacy columns by matching well-known key names
        const legacyCols: Record<string, number | null | undefined> = {
          defense: (existing as Record<string, unknown> | null)?.defense_rating as number | null | undefined,
          cycle_time: (existing as Record<string, unknown> | null)?.cycle_time_rating as number | null | undefined,
          reliability: (existing as Record<string, unknown> | null)?.reliability_rating as number | null | undefined,
          shooting_reliability: (existing as Record<string, unknown> | null)?.shooting_reliability as number | null | undefined,
        };
        init[field.key] = legacyCols[field.key] ?? 3;
      }
    }
    return init;
  });
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [dockProgress, setDockProgress] = useState(false);
  const [progressHeight, setProgressHeight] = useState(0);
  const [abilityAnswers, setAbilityAnswers] = useState<
    Record<string, boolean | null>
  >(() => {
    const existingAnswers = parseAbilityAnswers(existing?.ability_answers);
    const initial: Record<string, boolean | null> = {};
    for (const question of abilityQuestions) {
      initial[question] =
        typeof existingAnswers[question] === "boolean"
          ? existingAnswers[question]
          : null;
    }
    return initial;
  });
  const [customData, setCustomData] = useState<Record<string, CustomFieldValue>>(
    () => parseCustomData(existing?.custom_data, customSections)
  );
  const customDataPayload = useMemo(
    () => sanitizeCustomData(customData, customSections),
    [customData, customSections]
  );

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const progressWrapRef = useRef<HTMLDivElement | null>(null);
  const progressNavRef = useRef<HTMLElement | null>(null);

  // ── Draft auto-save / restore ──────────────────────────────────
  const draftKey = useMemo(
    () => buildDraftKey(eventKey, matchId, teamNumber, userId),
    [eventKey, matchId, teamNumber, userId]
  );

  // Restore draft on mount (only if there's no server-side existing entry)
  useEffect(() => {
    if (existing) return; // Server data takes precedence
    let cancelled = false;
    void getDraft(draftKey).then((draft) => {
      if (cancelled || !draft) return;
      const d = draft.form_data;
      setAutoScore(d.auto_score);
      setAutoStartPosition(
        typeof d.auto_start_position === "string" &&
          startPositionSet.has(d.auto_start_position)
          ? d.auto_start_position
          : null
      );
      setAutoNotes(d.auto_notes);
      setShootingRanges(
        Array.isArray(d.shooting_ranges)
          ? d.shooting_ranges.filter((r: string) => shootingKeys.has(r))
          : []
      );
      setTeleopScore(d.teleop_score);
      setIntakeMethods(
        Array.isArray(d.intake_methods)
          ? d.intake_methods.filter((m: string) => intakeKeys.has(m))
          : []
      );
      setEndgameScore(d.endgame_score);
      setClimbLevels(
        Array.isArray(d.climb_levels)
          ? d.climb_levels.filter((l: string) => climbKeys.has(l))
          : []
      );
      if (d.ratings) {
        setRatings((prev) => ({ ...prev, ...d.ratings }));
      } else {
        // legacy draft fallback
        const legacyRatings: Record<string, number | undefined> = {
          defense: d.defense_rating,
          cycle_time: d.cycle_time_rating,
          reliability: d.reliability_rating,
          shooting_reliability: d.shooting_reliability,
        };
        setRatings((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            if (typeof legacyRatings[key] === "number") next[key] = legacyRatings[key]!;
          }
          return next;
        });
      }
      setNotes(d.notes);
      if (d.ability_answers) {
        setAbilityAnswers(d.ability_answers);
      }
      if (d.custom_data) {
        setCustomData(parseCustomData(d.custom_data, customSections));
      }
      setDraftRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, [customSections, draftKey, existing, startPositionSet, intakeKeys, climbKeys, shootingKeys]);

  // Auto-dismiss "Draft restored" banner after 6 seconds
  useEffect(() => {
    if (!draftRestored) return;
    const timer = setTimeout(() => setDraftRestored(false), 6000);
    return () => clearTimeout(timer);
  }, [draftRestored]);

  // Auto-save draft every 5 seconds (debounced via timeout)
  // Skip the initial mount — only save once user has actually changed something
  const draftMountedRef = useRef(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftMountedRef.current) {
      draftMountedRef.current = true;
      return;
    }
    // Don't save drafts after successful submission
    if (submitted) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const formData: DraftFormData = {
        auto_score: autoScore,
        auto_start_position: autoStartPosition,
        auto_notes: autoNotes,
        shooting_ranges: shootingRanges,
        teleop_score: teleopScore,
        intake_methods: intakeMethods,
        endgame_score: endgameScore,
        climb_levels: climbLevels,
        ratings,
        ability_answers: abilityAnswers,
        custom_data: customDataPayload,
        notes,
      };
      void saveDraft({
        id: draftKey,
        event_key: eventKey ?? "none",
        match_id: matchId,
        team_number: teamNumber,
        user_id: userId,
        form_data: formData,
        _schema: DRAFT_SCHEMA_VERSION,
        _savedAt: new Date().toISOString(),
      });
    }, 5000);

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [
    autoScore,
    autoStartPosition,
    autoNotes,
    shootingRanges,
    ratings,
    teleopScore,
    intakeMethods,
    endgameScore,
    climbLevels,
    abilityAnswers,
    customDataPayload,
    notes,
    submitted,
    draftKey,
    eventKey,
    matchId,
    teamNumber,
    userId,
  ]);

  const steps = useMemo(
    () => {
      return orderedSectionIds.map((id) => {
        if (isDefaultSectionId(id)) {
          const labels: Record<DefaultSectionId, { label: string; progressLabel: string }> = {
            auto: { label: "Auto", progressLabel: "Auto" },
            teleop: { label: "Teleop", progressLabel: "Teleop" },
            endgame: { label: "Endgame", progressLabel: "Endgame" },
            ratings: { label: "Ratings", progressLabel: "Ratings" },
            abilities: { label: "Abilities", progressLabel: "Ability" },
            notes: { label: "Notes", progressLabel: "Notes" },
          };

          return { id, ...labels[id] };
        }

        const customTitle = customSectionsById[id]?.title.trim() || "Custom";
        return { id, label: customTitle, progressLabel: customTitle };
      });
    },
    [customSectionsById, orderedSectionIds]
  );

  const abilityAnswersPayload = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(abilityAnswers).filter(
          (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
        )
      ),
    [abilityAnswers]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let frame: number | null = null;
    const updateActiveStep = () => {
      const marker = window.innerHeight * 0.28;
      let nextStep = 0;

      steps.forEach((step, index) => {
        const section = sectionRefs.current[step.id];
        if (!section) return;
        const rect = section.getBoundingClientRect();
        if (rect.top <= marker) nextStep = index;
      });

      setActiveStep((prev) => (prev === nextStep ? prev : nextStep));
    };

    const onViewportChange = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveStep);
    };

    updateActiveStep();
    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [steps]);

  useEffect(() => {
    const updateHeight = () => {
      setProgressHeight(progressNavRef.current?.offsetHeight ?? 0);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    const threshold = 8;
    const updateDockState = () => {
      const wrap = progressWrapRef.current;
      if (!wrap) return;
      const shouldDock = wrap.getBoundingClientRect().top <= threshold;
      setDockProgress((prev) => (prev === shouldDock ? prev : shouldDock));
    };

    updateDockState();
    window.addEventListener("scroll", updateDockState, { passive: true });
    window.addEventListener("resize", updateDockState);
    return () => {
      window.removeEventListener("scroll", updateDockState);
      window.removeEventListener("resize", updateDockState);
    };
  }, []);

  const entryData = {
    match_id: matchId,
    team_number: teamNumber,
    auto_score: autoScore,
    auto_start_position: autoStartPosition,
    auto_notes: autoNotes.trim() || null,
    teleop_score: teleopScore,
    intake_methods: intakeMethods.length > 0 ? intakeMethods : null,
    endgame_score: endgameScore,
    climb_levels: climbLevels.length > 0 ? climbLevels : null,
    endgame_state: climbLevels[0] ?? null,
    ratings,
    // legacy columns: write back for any well-known keys so old queries still work
    shooting_reliability: ratings["shooting_reliability"] ?? null,
    defense_rating: ratings["defense"] ?? 3,
    cycle_time_rating: ratings["cycle_time"] ?? null,
    reliability_rating: ratings["reliability"] ?? 3,
    shooting_ranges: shootingRanges.length > 0 ? shootingRanges : null,
    shooting_range: shootingRanges[0] ?? null,
    ability_answers: abilityAnswersPayload,
    custom_data: Object.keys(customDataPayload).length > 0 ? customDataPayload : null,
    notes: notes.trim(),
  };

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const entry = {
      ...entryData,
      org_id: orgId,
      scouted_by: userId,
    };

    try {
      let payload = { ...entry };
      let attempts = 0;

      while (attempts < 5) {
        const result = await supabase
          .from("scouting_entries")
          .upsert(payload, {
            onConflict: "match_id,team_number,scouted_by",
          });

        if (!result.error) {
          break;
        }

        const nextPayload = stripUnsupportedScoutingColumns(
          payload,
          result.error.message
        );
        const changed =
          Object.keys(nextPayload).length < Object.keys(payload).length;
        if (!changed) {
          throw new Error(result.error.message);
        }

        payload = nextPayload;
        attempts += 1;
      }

      // Submitted online successfully — clear draft since server confirmed
      void removeDraft(draftKey);
      setSubmitted(true);
      setSavedOffline(false);
      setLoading(false);
      setTimeout(() => {
        if (eventKey) {
          router.push(`/dashboard/events/${eventKey}/matches?updated=1`);
          router.refresh();
        } else {
          router.back();
        }
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save.";
      const lowerMessage = message.toLowerCase();
      const shouldSaveOffline =
        typeof navigator !== "undefined" &&
        (!navigator.onLine ||
          lowerMessage.includes("fetch") ||
          lowerMessage.includes("network") ||
          lowerMessage.includes("timeout"));

      if (!shouldSaveOffline) {
        setError(message);
        setLoading(false);
        return;
      }

      // Network issue (offline/timeout) — save to IndexedDB
      try {
        await saveOffline({
          id: `${matchId}-${teamNumber}-${userId}`,
          ...entry,
          created_at: new Date().toISOString(),
        });
        const count = await getPendingCount();
        setPendingCount(count);
        setSubmitted(true);
        setSavedOffline(true);
        setLoading(false);
      } catch {
        setError("Failed to save. Please try again.");
        setLoading(false);
      }
    }
  }

  const sectionIndexById = useMemo(
    () =>
      Object.fromEntries(
        orderedSectionIds.map((sectionId, index) => [sectionId, index])
      ) as Record<string, number>,
    [orderedSectionIds]
  );

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
          <div key={field.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
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
        const isEnabled = currentValue === true;
        return (
          <div key={field.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm font-medium text-slate-200">{field.label}</p>
            <button
              type="button"
              onClick={() => updateCustomFieldValue(field.id, isEnabled ? undefined : true)}
              className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                isEnabled
                  ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200"
                  : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              {isEnabled ? "Enabled" : "Enable"}
            </button>
          </div>
        );
      }
      case "multi-select": {
        const options = field.options ?? [];
        const selected = Array.isArray(currentValue)
          ? currentValue.filter((item): item is string => typeof item === "string")
          : [];

        return (
          <div key={field.id} className="space-y-2 rounded-md border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm font-medium text-slate-200">{field.label}</p>
            <p className="text-[11px] text-gray-500">Multi-select</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(options.length, 3))}, minmax(0, 1fr))` }}>
              {options.map((option) => {
                const active = selected.includes(option.key);
                return (
                  <button
                    key={`${field.id}-${option.key}`}
                    type="button"
                    onClick={() =>
                      updateCustomFieldValue(
                        field.id,
                        active
                          ? selected.filter((item) => item !== option.key)
                          : [...selected, option.key]
                      )
                    }
                    className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                      active
                        ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200"
                        : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      case "rating": {
        const maxStars = field.maxStars ?? 5;
        const value =
          typeof currentValue === "number" && Number.isFinite(currentValue)
            ? clampNumber(Math.trunc(currentValue), 0, maxStars)
            : 0;

        return (
          <div key={field.id} className="space-y-2 rounded-md border border-white/10 bg-white/[0.03] p-3">
            <span id={`custom-rating-${field.id}`} className="text-sm font-medium text-slate-200">
              {field.label}
            </span>
            <div
              role="radiogroup"
              aria-labelledby={`custom-rating-${field.id}`}
              className="flex flex-wrap gap-1"
            >
              {Array.from({ length: maxStars }, (_, index) => {
                const star = index + 1;
                const active = star <= value;
                return (
                  <button
                    key={`${field.id}-${star}`}
                    type="button"
                    role="radio"
                    aria-checked={value === star}
                    aria-label={`${star} of ${maxStars} stars`}
                    onClick={() => updateCustomFieldValue(field.id, value === star ? 0 : star)}
                    className="text-2xl transition-transform hover:scale-110 active:scale-110"
                  >
                    <span className={active ? "text-yellow-400" : "text-gray-600"}>&#9733;</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      case "text":
        return (
          <div key={field.id} className="space-y-2 rounded-md border border-white/10 bg-white/[0.03] p-3">
            <label htmlFor={`custom-text-${field.id}`} className="text-sm font-medium text-slate-200">
              {field.label}
            </label>
            <textarea
              id={`custom-text-${field.id}`}
              value={typeof currentValue === "string" ? currentValue : ""}
              onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder ?? "Type your response..."}
              rows={3}
              className="w-full px-3 py-2 text-sm text-white shadow-sm placeholder:text-gray-500 scout-input"
            />
          </div>
        );
    }
  };

  const renderSection = (sectionId: string) => {
    const stepIndex = sectionIndexById[sectionId] ?? 0;
    const setCurrentStep = () => setActiveStep(stepIndex);

    if (isDefaultSectionId(sectionId)) {
      switch (sectionId) {
        case "auto":
          return (
            <section
              key={sectionId}
              ref={(node) => {
                sectionRefs.current[sectionId] = node;
              }}
              onTouchStart={setCurrentStep}
              onMouseDown={setCurrentStep}
              className="scout-panel p-4"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal-300">
                Autonomous
              </h2>
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-center gap-6">
                  <CounterButton label="Points" value={autoScore} onChange={setAutoScore} />
                </div>

                {formConfig.autoStartPositions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      Starting Route
                    </p>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(formConfig.autoStartPositions.length, 4)}, minmax(0, 1fr))` }}>
                      {formConfig.autoStartPositions.map((route) => (
                        <button
                          key={route}
                          type="button"
                          onClick={() => setAutoStartPosition(route)}
                          className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                            autoStartPosition === route
                              ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200"
                              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          {route}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="auto-comments" className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Auto Comments
                  </label>
                  <textarea
                    id="auto-comments"
                    value={autoNotes}
                    onChange={(e) => setAutoNotes(e.target.value)}
                    placeholder="Route success, misses, timing notes..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm text-white shadow-sm placeholder:text-gray-500 scout-input"
                  />
                </div>
              </div>
            </section>
          );
        case "teleop":
          return (
            <section
              key={sectionId}
              ref={(node) => {
                sectionRefs.current[sectionId] = node;
              }}
              onTouchStart={setCurrentStep}
              onMouseDown={setCurrentStep}
              className="scout-panel p-4"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-300">
                Teleop
              </h2>
              <div className="flex flex-wrap items-end justify-center gap-6">
                <CounterButton label="Points" value={teleopScore} onChange={setTeleopScore} max={999} />
              </div>

              {formConfig.intakeOptions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Intake Method
                  </p>
                  <p className="text-[11px] text-gray-500">Multi-select</p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(formConfig.intakeOptions.length, 3)}, minmax(0, 1fr))` }}>
                    {formConfig.intakeOptions.map((option) => {
                      const active = intakeMethods.includes(option.key);
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() =>
                            setIntakeMethods((prev) =>
                              prev.includes(option.key)
                                ? prev.filter((item) => item !== option.key)
                                : [...prev, option.key]
                            )
                          }
                          className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                            active
                              ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200"
                              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        case "endgame":
          return (
            <section
              key={sectionId}
              ref={(node) => {
                sectionRefs.current[sectionId] = node;
              }}
              onTouchStart={setCurrentStep}
              onMouseDown={setCurrentStep}
              className="scout-panel p-4"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-purple-300">
                Endgame
              </h2>
              <div className="flex flex-wrap items-end justify-center gap-6">
                <CounterButton label="Points" value={endgameScore} onChange={setEndgameScore} max={999} />
              </div>

              {formConfig.climbLevelOptions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Climb
                  </p>
                  <p className="text-[11px] text-gray-500">Multi-select</p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(formConfig.climbLevelOptions.length, 4)}, minmax(0, 1fr))` }}>
                    {formConfig.climbLevelOptions.map((option) => {
                      const active = climbLevels.includes(option.key);
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() =>
                            setClimbLevels((prev) =>
                              prev.includes(option.key)
                                ? prev.filter((item) => item !== option.key)
                                : [...prev, option.key]
                            )
                          }
                          className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                            active
                              ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200"
                              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        case "ratings":
          return (
            <section
              key={sectionId}
              ref={(node) => {
                sectionRefs.current[sectionId] = node;
              }}
              onTouchStart={setCurrentStep}
              onMouseDown={setCurrentStep}
              className="scout-panel p-4"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal-300">
                Ratings
              </h2>
              <div className="space-y-4">
                {formConfig.shootingRangeOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      Shooting Range
                    </p>
                    <p className="text-[11px] text-gray-500">Multi-select</p>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(formConfig.shootingRangeOptions.length, 4)}, minmax(0, 1fr))` }}>
                      {formConfig.shootingRangeOptions.map((range) => (
                        <button
                          key={`ratings-${range.key}`}
                          type="button"
                          onClick={() =>
                            setShootingRanges((prev) =>
                              prev.includes(range.key)
                                ? prev.filter((item) => item !== range.key)
                                : [...prev, range.key]
                            )
                          }
                          className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                            shootingRanges.includes(range.key)
                              ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200"
                              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {formConfig.ratingFields.map((field) => (
                    <StarRating
                      key={field.key}
                      label={field.label}
                      value={ratings[field.key] ?? 3}
                      onChange={(v) => setRatings((prev) => ({ ...prev, [field.key]: v }))}
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        case "abilities":
          return (
            <section
              key={sectionId}
              ref={(node) => {
                sectionRefs.current[sectionId] = node;
              }}
              onTouchStart={setCurrentStep}
              onMouseDown={setCurrentStep}
              className="scout-panel p-4"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Ability Checks
              </h2>
              <div className="space-y-3">
                {abilityQuestions.map((question) => {
                  const answer = abilityAnswers[question] ?? null;
                  return (
                    <div
                      key={question}
                      className="rounded-md border border-white/10 bg-white/[0.03] p-3"
                    >
                      <p className="text-sm font-medium text-slate-200">{question}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setAbilityAnswers((prev) => ({
                              ...prev,
                              [question]: true,
                            }))
                          }
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                            answer === true
                              ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-200"
                              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAbilityAnswers((prev) => ({
                              ...prev,
                              [question]: false,
                            }))
                          }
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                            answer === false
                              ? "border-rose-400/70 bg-rose-500/20 text-rose-200"
                              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAbilityAnswers((prev) => ({
                              ...prev,
                              [question]: null,
                            }))
                          }
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 transition hover:bg-white/10"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        case "notes":
          return (
            <section
              key={sectionId}
              ref={(node) => {
                sectionRefs.current[sectionId] = node;
              }}
              onTouchStart={setCurrentStep}
              onMouseDown={setCurrentStep}
              className="scout-panel p-4"
            >
              <label htmlFor="scouting-notes" className="mb-3 block text-sm font-semibold uppercase tracking-wider text-gray-300">
                Notes
              </label>
              <textarea
                id="scouting-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Quick observations..."
                rows={3}
                className="w-full px-3 py-2 text-sm text-white shadow-sm placeholder:text-gray-500 scout-input"
              />
            </section>
          );
      }
    }

    const customSection = customSectionsById[sectionId];
    if (!customSection) return null;

    return (
      <section
        key={customSection.id}
        ref={(node) => {
          sectionRefs.current[customSection.id] = node;
        }}
        onTouchStart={setCurrentStep}
        onMouseDown={setCurrentStep}
        className="scout-panel p-4"
      >
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-cyan-300">
          {customSection.title}
        </h2>
        {customSection.description?.trim() ? (
          <p className="mb-4 text-sm text-gray-400">{customSection.description.trim()}</p>
        ) : null}
        <div className="space-y-3">
          {customSection.fields.map((field) => renderCustomField(field))}
        </div>
      </section>
    );
  };

  if (submitted) {
    return (
      <div className="space-y-4 pb-8">
        <div
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-8 backdrop-blur-sm ${
            savedOffline
              ? "border-teal-400/30 bg-teal-500/10"
              : "border-emerald-400/30 bg-emerald-500/10"
          }`}
        >
          <div className="text-4xl">{savedOffline ? "✓" : "✓"}</div>
          <p
            className={`text-lg font-semibold ${
              savedOffline ? "text-teal-200" : "text-emerald-200"
            }`}
          >
            {savedOffline
              ? "Saved Offline"
              : existing
              ? "Entry Updated!"
              : "Entry Submitted!"}
          </p>
          {savedOffline && (
            <>
              <p className="text-sm text-teal-200/80 text-center">
                Your entry is saved on this device and will sync automatically
                when you reconnect.
              </p>
              <p className="text-xs text-teal-200/70">
                {pendingCount} {pendingCount === 1 ? "entry" : "entries"} queued
              </p>
            </>
          )}
          {!savedOffline && (
            <p className="text-sm text-emerald-200/80">Returning to match list...</p>
          )}
        </div>

        {savedOffline && (
          <div className="rounded-xl border border-teal-400/30 bg-teal-500/10 p-4 text-sm text-teal-200">
            Offline mode is active. You can keep scouting and we&apos;ll sync your
            entries when the connection returns. Some pages (like the dashboard)
            won&apos;t load until you&apos;re back online.
          </div>
        )}

        {savedOffline && (
          <button
            onClick={() => router.back()}
            className="back-button back-button-block back-button-lg"
          >
            Back to Matches
          </button>
        )}
      </div>
    );
  }

  return (
      <div className="space-y-6 pb-8">
      {error && (
        <div role="alert" className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {draftRestored && (
        <div className="flex items-center justify-between rounded-md border border-teal-400/30 bg-teal-500/10 p-3 text-sm text-teal-200">
          <span>Draft restored from a previous session</span>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            className="ml-2 text-xs text-teal-300/70 hover:text-teal-200"
            aria-label="Dismiss draft restored notice"
          >
            ✕
          </button>
        </div>
      )}

      <div
        ref={progressWrapRef}
        style={dockProgress && progressHeight > 0 ? { minHeight: `${progressHeight}px` } : undefined}
      >
        <nav
          ref={progressNavRef}
          aria-label="Scouting form progress"
          className={`scout-progress-sticky p-3 ${dockProgress ? "scout-progress-fixed" : ""}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
              Progress
            </p>
            <p className="text-xs text-gray-400" aria-live="polite">
              Step {activeStep + 1} of {steps.length}
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={activeStep + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={`Scouting progress: step ${activeStep + 1} of ${steps.length}, ${steps[activeStep]?.label ?? ""}`}
            className="mt-3 grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
            }}
          >
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                aria-label={`Go to ${step.label} section${index <= activeStep ? " (completed)" : ""}`}
                onClick={() =>
                  sectionRefs.current[step.id]?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="min-w-0 min-h-[44px] text-center"
              >
                <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span
                    className={`block h-full rounded-full bg-cyan-400 transition-all duration-500 ease-out ${
                      index <= activeStep ? "w-full" : "w-0"
                    }`}
                  />
                </span>
                <span
                  className={`mt-1 block truncate text-[11px] font-medium uppercase tracking-[0.1em] transition-colors duration-300 sm:text-xs ${
                    index === activeStep ? "text-cyan-200" : "text-gray-400"
                  }`}
                >
                  {step.progressLabel}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {orderedSectionIds.map((sectionId) => renderSection(sectionId))}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-lg bg-cyan-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50"
      >
        {loading
          ? "Submitting..."
          : existing
            ? "Update Entry"
            : "Submit Scouting Entry"}
      </button>
    </div>
  );
}
