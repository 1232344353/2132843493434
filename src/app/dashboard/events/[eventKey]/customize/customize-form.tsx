"use client";

import { useState, useTransition, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { saveEventFormConfig, resetMatchEventFormConfig, resetPitEventFormConfig } from "@/lib/event-form-actions";
import type { ScoutingFormConfig, PitScoutFormConfig, FormOptionItem, CustomSection, CustomFieldType, CustomFieldDef, DefaultSectionId, PitSectionId } from "@/lib/platform-settings";
import { DEFAULT_SECTION_IDS, PIT_SECTION_IDS } from "@/lib/platform-settings";
import type { EventFormConfig } from "@/lib/event-form-config";

/* ── Shared mini-editors (same pattern as admin scouting tab) ── */

function OptionListEditor({
  title,
  description,
  items,
  onChange,
  keyPlaceholder = "key",
  labelPlaceholder = "Label",
}: {
  title?: string;
  description?: string;
  items: FormOptionItem[];
  onChange: (items: FormOptionItem[]) => void;
  keyPlaceholder?: string;
  labelPlaceholder?: string;
}) {
  const updateItem = (i: number, field: "key" | "label", value: string) =>
    onChange(items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const removeItem = (i: number) =>
    onChange(items.length <= 1 ? [{ key: "", label: "" }] : items.filter((_, idx) => idx !== i));

  const addItem = () => onChange([...items, { key: "", label: "" }]);

  const moveItem = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= items.length) return;
    const next = [...items];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {(title || description) && (
        <div>
          {title ? <h4 className="text-sm font-semibold text-white">{title}</h4> : null}
          {description ? <p className="mt-0.5 text-xs text-gray-400">{description}</p> : null}
        </div>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={`${title}-${i}`} className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button type="button" disabled={i === 0} onClick={() => moveItem(i, -1)} className="text-gray-500 hover:text-gray-300 disabled:opacity-20" aria-label="Move up">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button type="button" disabled={i === items.length - 1} onClick={() => moveItem(i, 1)} className="text-gray-500 hover:text-gray-300 disabled:opacity-20" aria-label="Move down">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <input type="text" value={item.key} onChange={(e) => updateItem(i, "key", e.target.value)} placeholder={keyPlaceholder} className="dashboard-input w-28 shrink-0 px-2 py-1.5 text-xs font-mono" />
            <input type="text" value={item.label} onChange={(e) => updateItem(i, "label", e.target.value)} placeholder={labelPlaceholder} className="dashboard-input flex-1 px-2 py-1.5 text-sm" />
            <button type="button" onClick={() => removeItem(i)} className="rounded-lg border border-red-400/30 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/20" aria-label="Remove">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add option
      </button>
    </div>
  );
}

function StringListEditor({
  title,
  description,
  items,
  onChange,
  placeholder = "Value",
}: {
  title?: string;
  description?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const updateItem = (i: number, value: string) =>
    onChange(items.map((item, idx) => (idx === i ? value : item)));

  const removeItem = (i: number) =>
    onChange(items.length <= 1 ? [""] : items.filter((_, idx) => idx !== i));

  const addItem = () => onChange([...items, ""]);

  const moveItem = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= items.length) return;
    const next = [...items];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {(title || description) && (
        <div>
          {title ? <h4 className="text-sm font-semibold text-white">{title}</h4> : null}
          {description ? <p className="mt-0.5 text-xs text-gray-400">{description}</p> : null}
        </div>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={`${title}-${i}`} className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button type="button" disabled={i === 0} onClick={() => moveItem(i, -1)} className="text-gray-500 hover:text-gray-300 disabled:opacity-20" aria-label="Move up">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button type="button" disabled={i === items.length - 1} onClick={() => moveItem(i, 1)} className="text-gray-500 hover:text-gray-300 disabled:opacity-20" aria-label="Move down">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <input type="text" value={item} onChange={(e) => updateItem(i, e.target.value)} placeholder={placeholder} className="dashboard-input flex-1 px-2 py-1.5 text-sm" />
            <button type="button" onClick={() => removeItem(i)} className="rounded-lg border border-red-400/30 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/20" aria-label="Remove">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add option
      </button>
    </div>
  );
}

const MATCH_SECTION_META: Record<DefaultSectionId, { title: string; description: string }> = {
  auto: {
    title: "Auto Start Positions",
    description: "Autonomous: position buttons for robot start.",
  },
  teleop: {
    title: "Intake Methods",
    description: "Teleop: how the robot picks up game pieces.",
  },
  endgame: {
    title: "Climb Levels",
    description: "Endgame: climb stages the robot can reach.",
  },
  ratings: {
    title: "Ratings",
    description: "Ratings: shooting ranges and 1-5 star categories shown on the scout form.",
  },
  abilities: {
    title: "Ability Questions",
    description: "Yes/No questions shown near the end of every scouting form.",
  },
  notes: {
    title: "Notes",
    description: "Free-response notes shown at the end of every scouting form.",
  },
};

const PIT_SECTION_META: Record<PitSectionId, { title: string; description: string }> = {
  build: {
    title: "Robot Build",
    description: "Drivetrain and physical build details shown before matches start.",
  },
  scoring: {
    title: "Scoring",
    description: "Intake, scoring range, cycle estimate, and shooter output.",
  },
  endgame: {
    title: "Endgame",
    description: "Climb capability shown in the pit form.",
  },
  auto_notes: {
    title: "Auto & Notes",
    description: "Auto routine notes and overall scout observations.",
  },
};

function isDefaultSectionId(value: string): value is DefaultSectionId {
  return DEFAULT_SECTION_IDS.includes(value as DefaultSectionId);
}

function isPitSectionId(value: string): value is PitSectionId {
  return PIT_SECTION_IDS.includes(value as PitSectionId);
}

function AddSectionDivider({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="group/addsec relative flex items-center py-2 cursor-pointer"
      onClick={onAdd}
    >
      <div className="flex-1 border-t border-white/5 transition group-hover/addsec:border-white/10" />
      <button
        type="button"
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-gray-600 opacity-0 transition-all group-hover/addsec:opacity-100 group-hover/addsec:text-gray-400"
        tabIndex={-1}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add custom section
      </button>
    </div>
  );
}

function EditIconButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 text-gray-600 transition hover:text-gray-300 ${className}`}
      aria-label={label}
      title={label}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  );
}

function ResetSectionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={onClick}
      className="rounded-full border-white/12 bg-white/[0.03] px-3.5 text-gray-200 shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:border-white/18 hover:bg-white/[0.07]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-9.36L1 10" />
      </svg>
      {label}
    </Button>
  );
}

/* ── Tab types ── */

type TabId = "match" | "pit";

/* ── Main component ── */

export function EventCustomizeForm({
  eventKey,
  initialConfig,
}: {
  eventKey: string;
  initialConfig: EventFormConfig;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("match");
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Match scouting config
  const [intakeOptions, setIntakeOptions] = useState<FormOptionItem[]>(initialConfig.formConfig.intakeOptions);
  const [climbLevelOptions, setClimbLevelOptions] = useState<FormOptionItem[]>(initialConfig.formConfig.climbLevelOptions);
  const [shootingRangeOptions, setShootingRangeOptions] = useState<FormOptionItem[]>(initialConfig.formConfig.shootingRangeOptions);
  const [autoStartPositions, setAutoStartPositions] = useState<string[]>(initialConfig.formConfig.autoStartPositions);
  const [ratingFields, setRatingFields] = useState<FormOptionItem[]>(initialConfig.formConfig.ratingFields);

  // Pit scout config
  const [pitDrivetrainOptions, setPitDrivetrainOptions] = useState<string[]>(initialConfig.pitScoutConfig.drivetrainOptions);
  const [pitIntakeOptions, setPitIntakeOptions] = useState<FormOptionItem[]>(initialConfig.pitScoutConfig.intakeOptions);
  const [pitScoringRangeOptions, setPitScoringRangeOptions] = useState<FormOptionItem[]>(initialConfig.pitScoutConfig.scoringRangeOptions);
  const [pitClimbOptions, setPitClimbOptions] = useState<string[]>(initialConfig.pitScoutConfig.climbOptions);
  const [pitFuelOutputOptions, setPitFuelOutputOptions] = useState<string[]>(initialConfig.pitScoutConfig.fuelOutputOptions);
  const [pitUnifiedOrder, setPitUnifiedOrder] = useState<string[]>(() => {
    const saved = initialConfig.pitScoutConfig.sectionOrder ?? [];
    const customs = initialConfig.pitScoutConfig.customSections ?? [];
    const customIds = new Set(customs.map((s) => s.id));
    const ordered = saved.filter((id) => isPitSectionId(id) || customIds.has(id));
    for (const id of PIT_SECTION_IDS) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    for (const id of customIds) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  });
  const [hiddenPitSections, setHiddenPitSections] = useState<Set<PitSectionId>>(
    new Set((initialConfig.pitScoutConfig.hiddenSections ?? []).filter(isPitSectionId))
  );
  const [pitCustomSectionsMap, setPitCustomSectionsMap] = useState<Record<string, CustomSection>>(() => {
    const map: Record<string, CustomSection> = {};
    for (const s of initialConfig.pitScoutConfig.customSections ?? []) map[s.id] = s;
    return map;
  });

  // Ability questions
  const [questions, setQuestions] = useState<string[]>(
    initialConfig.questions.length > 0 ? initialConfig.questions : [""]
  );

  // Unified section order (both DefaultSectionIds and custom section IDs)
  const [unifiedOrder, setUnifiedOrder] = useState<string[]>(() => {
    const saved = initialConfig.formConfig.sectionOrder ?? [];
    const customs = initialConfig.formConfig.customSections ?? [];
    const customIds = new Set(customs.map((s) => s.id));
    const ordered: string[] = saved.filter((id) => isDefaultSectionId(id) || customIds.has(id));
    for (const id of DEFAULT_SECTION_IDS) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    for (const id of customIds) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  });
  const [hiddenSections, setHiddenSections] = useState<Set<DefaultSectionId>>(
    new Set((initialConfig.formConfig.hiddenSections ?? []).filter(isDefaultSectionId))
  );

  // Custom sections stored as a map for O(1) lookup
  const [customSectionsMap, setCustomSectionsMap] = useState<Record<string, CustomSection>>(() => {
    const map: Record<string, CustomSection> = {};
    for (const s of initialConfig.formConfig.customSections ?? []) map[s.id] = s;
    return map;
  });

  const [editingCustomSectionId, setEditingCustomSectionId] = useState<string | null>(null);
  const [editingCustomSectionDescriptionId, setEditingCustomSectionDescriptionId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<"match" | "pit" | null>(null);
  const [isResetPending, setIsResetPending] = useState(false);

  const showStatus = useCallback((msg: string, ok = true) => {
    setStatus({ msg, ok });
    setTimeout(() => setStatus(null), 3500);
  }, []);

  async function handleSaveMatch() {
    const hidden = Array.from(hiddenSections);
    const customSectionsArr = unifiedOrder
      .filter((id) => !isDefaultSectionId(id))
      .map((id) => customSectionsMap[id])
      .filter((s): s is CustomSection => Boolean(s));
    const config: ScoutingFormConfig = {
      intakeOptions,
      climbLevelOptions,
      shootingRangeOptions,
      autoStartPositions,
      ratingFields,
      ...(hidden.length > 0 && { hiddenSections: hidden }),
      ...(customSectionsArr.length > 0 && { customSections: customSectionsArr }),
      sectionOrder: unifiedOrder,
    };
    const normalized = questions.map((q) => q.trim().replace(/\s+/g, " ")).filter((q) => q.length > 0);
    const formData = new FormData();
    formData.set("eventKey", eventKey);
    formData.set("formConfigJson", JSON.stringify(config));
    formData.set("questionsJson", JSON.stringify(normalized));
    const result = await saveEventFormConfig(formData);
    if ("error" in result) { showStatus(result.error ?? "Save failed.", false); return; }
    showStatus("Match scouting form saved.");
    startTransition(() => router.refresh());
  }

  async function handleSavePit() {
    const hidden = Array.from(hiddenPitSections);
    const customSectionsArr = pitUnifiedOrder
      .filter((id) => !isPitSectionId(id))
      .map((id) => pitCustomSectionsMap[id])
      .filter((s): s is CustomSection => Boolean(s));
    const config: PitScoutFormConfig = {
      drivetrainOptions: pitDrivetrainOptions,
      intakeOptions: pitIntakeOptions,
      scoringRangeOptions: pitScoringRangeOptions,
      climbOptions: pitClimbOptions,
      fuelOutputOptions: pitFuelOutputOptions,
      ...(hidden.length > 0 && { hiddenSections: hidden }),
      ...(customSectionsArr.length > 0 && { customSections: customSectionsArr }),
      sectionOrder: pitUnifiedOrder,
    };
    const formData = new FormData();
    formData.set("eventKey", eventKey);
    formData.set("pitScoutConfigJson", JSON.stringify(config));
    const result = await saveEventFormConfig(formData);
    if ("error" in result) { showStatus(result.error ?? "Save failed.", false); return; }
    showStatus("Pit scout form saved.");
    startTransition(() => router.refresh());
  }

  async function handleReset(target: "match" | "pit") {
    setIsResetPending(true);
    const formData = new FormData();
    formData.set("eventKey", eventKey);

    const result = target === "match"
      ? await resetMatchEventFormConfig(formData)
      : await resetPitEventFormConfig(formData);

    setIsResetPending(false);

    if ("error" in result) {
      showStatus(result.error ?? "Reset failed.", false);
      return;
    }

    setResetTarget(null);
    showStatus(target === "match" ? "Match form reset to template." : "Pit form reset to template.");
    startTransition(() => router.refresh());
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "match", label: "Match Scouting" },
    { id: "pit", label: "Pit Scouting" },
  ];

  const moveSection = (index: number, dir: -1 | 1) => {
    setUnifiedOrder((prev) => {
      const nextIndex = index + dir;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const addCustomSectionAt = (insertIndex: number) => {
    const newId = `match-section-${Date.now()}`;
    setCustomSectionsMap((prev) => ({
      ...prev,
      [newId]: { id: newId, title: "New Section", description: "", fields: [] },
    }));
    setUnifiedOrder((prev) => {
      const next = [...prev];
      next.splice(insertIndex, 0, newId);
      return next;
    });
    setEditingCustomSectionId(newId);
    setEditingCustomSectionDescriptionId(newId);
  };

  const deleteCustomSection = (id: string) => {
    setUnifiedOrder((prev) => prev.filter((sid) => sid !== id));
    setCustomSectionsMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setEditingCustomSectionId((prev) => (prev === id ? null : prev));
    setEditingCustomSectionDescriptionId((prev) => (prev === id ? null : prev));
  };

  const updateCustomSection = (id: string, update: Partial<CustomSection>) =>
    setCustomSectionsMap((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));

  const addPitCustomSectionAt = (insertIndex: number) => {
    const newId = `pit-section-${Date.now()}`;
    setPitCustomSectionsMap((prev) => ({
      ...prev,
      [newId]: { id: newId, title: "New Section", description: "", fields: [] },
    }));
    setPitUnifiedOrder((prev) => {
      const next = [...prev];
      next.splice(insertIndex, 0, newId);
      return next;
    });
    setEditingCustomSectionId(newId);
    setEditingCustomSectionDescriptionId(newId);
  };

  const deletePitCustomSection = (id: string) => {
    setPitUnifiedOrder((prev) => prev.filter((sid) => sid !== id));
    setPitCustomSectionsMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditingCustomSectionId((prev) => (prev === id ? null : prev));
    setEditingCustomSectionDescriptionId((prev) => (prev === id ? null : prev));
  };

  const updatePitCustomSection = (id: string, update: Partial<CustomSection>) =>
    setPitCustomSectionsMap((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));

  const toggleSectionVisibility = (id: DefaultSectionId) => {
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const movePitSection = (index: number, dir: -1 | 1) => {
    setPitUnifiedOrder((prev) => {
      const nextIndex = index + dir;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const togglePitSectionVisibility = (id: PitSectionId) => {
    setHiddenPitSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderMatchSection = (sectionId: DefaultSectionId, index: number) => {
    const isHidden = hiddenSections.has(sectionId);
    const meta = MATCH_SECTION_META[sectionId];

    const content = (() => {
      switch (sectionId) {
        case "auto":
          return <StringListEditor items={autoStartPositions} onChange={setAutoStartPositions} placeholder="e.g. left" />;
        case "teleop":
          return <OptionListEditor items={intakeOptions} onChange={setIntakeOptions} keyPlaceholder="e.g. ground" labelPlaceholder="e.g. Ground Intake" />;
        case "endgame":
          return <OptionListEditor items={climbLevelOptions} onChange={setClimbLevelOptions} keyPlaceholder="e.g. level_1" labelPlaceholder="e.g. Level 1" />;
        case "ratings":
          return (
            <div className="space-y-6">
              <OptionListEditor title="Shooting Ranges" description="Effective shooting distances." items={shootingRangeOptions} onChange={setShootingRangeOptions} keyPlaceholder="e.g. close" labelPlaceholder="e.g. Close Range" />
              <OptionListEditor title="Star Rating Fields" description="1-5 star categories shown on the scout form. Keys can be anything, such as defense, speed, or accuracy." items={ratingFields} onChange={setRatingFields} keyPlaceholder="e.g. defense" labelPlaceholder="e.g. Defense Ability" />
            </div>
          );
        case "abilities":
          return (
            <div className="space-y-3">
              <div className="space-y-2">
                {questions.map((question, i) => (
                  <div key={`q-${i}`} className="flex items-center gap-2">
                    <input type="text" value={question} onChange={(e) => setQuestions((prev) => prev.map((q, idx) => (idx === i ? e.target.value : q)))} placeholder="e.g. Can cross the charge station?" className="dashboard-input w-full px-3 py-2 text-sm" />
                    <button type="button" onClick={() => setQuestions((prev) => prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== i))} className="rounded-lg border border-red-400/30 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/20" aria-label="Remove">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setQuestions((prev) => [...prev, ""])} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add question
              </button>
            </div>
          );
        case "notes":
          return (
            <div className="rounded-xl border border-white/10 bg-[#0b1220]/60 px-4 py-3 text-sm text-gray-400">
              Scouts will always see a free-response notes field in this section. There are no extra options to configure here yet.
            </div>
          );
      }
    })();

    return (
      <div key={sectionId} className={isHidden ? "opacity-60" : ""}>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex shrink-0 flex-col gap-0.5 mt-0.5">
            <button type="button" disabled={index === 0} onClick={() => moveSection(index, -1)} className="text-gray-600 transition-colors hover:text-gray-300 disabled:opacity-20" aria-label="Move up">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button type="button" disabled={index === unifiedOrder.length - 1} onClick={() => moveSection(index, 1)} className="text-gray-600 transition-colors hover:text-gray-300 disabled:opacity-20" aria-label="Move down">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${isHidden ? "text-gray-500 line-through" : "text-white"}`}>{meta.title}</h4>
            <p className="mt-0.5 text-xs text-gray-400">{meta.description}</p>
          </div>
          <button type="button" onClick={() => toggleSectionVisibility(sectionId)} className={`shrink-0 transition ${isHidden ? "text-gray-600 hover:text-gray-300" : "text-gray-500 hover:text-white"}`} aria-label={isHidden ? "Show section" : "Hide section"} title={isHidden ? "Show section" : "Hide section"}>
            {isHidden ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        {!isHidden && <div className="ml-7 mb-2">{content}</div>}
      </div>
    );
  };

  const renderPitSection = (sectionId: PitSectionId, index: number) => {
    const isHidden = hiddenPitSections.has(sectionId);
    const meta = PIT_SECTION_META[sectionId];

    const content = (() => {
      switch (sectionId) {
        case "build":
          return (
            <div className="space-y-6">
              <StringListEditor
                title="Drivetrain Options"
                description="Single-select for robot drivetrain type."
                items={pitDrivetrainOptions}
                onChange={setPitDrivetrainOptions}
                placeholder="e.g. Swerve"
              />
              <div className="rounded-xl border border-white/10 bg-[#0b1220]/60 px-4 py-3 text-sm text-gray-400">
                Robot dimensions remain part of the pit form, but there are no captain-side options to configure for that block yet.
              </div>
            </div>
          );
        case "scoring":
          return (
            <div className="space-y-6">
              <OptionListEditor
                title="Intake Types"
                description="Multi-select for how the robot picks up game pieces."
                items={pitIntakeOptions}
                onChange={setPitIntakeOptions}
                keyPlaceholder="e.g. ground"
                labelPlaceholder="e.g. Ground"
              />
              <OptionListEditor
                title="Scoring Ranges"
                description="Multi-select for effective scoring distances."
                items={pitScoringRangeOptions}
                onChange={setPitScoringRangeOptions}
                keyPlaceholder="e.g. close"
                labelPlaceholder="e.g. Close"
              />
              <StringListEditor
                title="Shooter Output Options"
                description="Single-select for shooter output volume."
                items={pitFuelOutputOptions}
                onChange={setPitFuelOutputOptions}
                placeholder="e.g. Moderate"
              />
              <div className="rounded-xl border border-white/10 bg-[#0b1220]/60 px-4 py-3 text-sm text-gray-400">
                Estimated cycles stays visible in this section, but it is still a plain numeric field rather than a configurable option list.
              </div>
            </div>
          );
        case "endgame":
          return (
            <StringListEditor
              title="Climb Options"
              description="Single-select for climb capability."
              items={pitClimbOptions}
              onChange={setPitClimbOptions}
              placeholder="e.g. Level 1"
            />
          );
        case "auto_notes":
          return (
            <div className="rounded-xl border border-white/10 bg-[#0b1220]/60 px-4 py-3 text-sm text-gray-400">
              Auto routine notes and overall team notes remain part of the pit form, but there are no captain-side option lists to configure in this section yet.
            </div>
          );
      }
    })();

    return (
      <div key={sectionId} className={isHidden ? "opacity-60" : ""}>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex shrink-0 flex-col gap-0.5 mt-0.5">
            <button type="button" disabled={index === 0} onClick={() => movePitSection(index, -1)} className="text-gray-600 transition-colors hover:text-gray-300 disabled:opacity-20" aria-label="Move up">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button type="button" disabled={index === pitUnifiedOrder.length - 1} onClick={() => movePitSection(index, 1)} className="text-gray-600 transition-colors hover:text-gray-300 disabled:opacity-20" aria-label="Move down">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${isHidden ? "text-gray-500 line-through" : "text-white"}`}>{meta.title}</h4>
            <p className="mt-0.5 text-xs text-gray-400">{meta.description}</p>
          </div>
          <button type="button" onClick={() => togglePitSectionVisibility(sectionId)} className={`shrink-0 transition ${isHidden ? "text-gray-600 hover:text-gray-300" : "text-gray-500 hover:text-white"}`} aria-label={isHidden ? "Show section" : "Hide section"} title={isHidden ? "Show section" : "Hide section"}>
            {isHidden ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        {!isHidden && <div className="ml-7 mb-2">{content}</div>}
      </div>
    );
  };

  const renderPitCustomSection = (id: string, index: number) => {
    const section = pitCustomSectionsMap[id];
    if (!section) return null;

    return (
      <Fragment key={id}>
        <div>
          <div className="flex items-start gap-3 mb-4">
            <div className="flex shrink-0 flex-col gap-0.5 mt-0.5">
              <button type="button" disabled={index === 0} onClick={() => movePitSection(index, -1)} className="text-gray-600 transition-colors hover:text-gray-300 disabled:opacity-20" aria-label="Move up">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button type="button" disabled={index === pitUnifiedOrder.length - 1} onClick={() => movePitSection(index, 1)} className="text-gray-600 transition-colors hover:text-gray-300 disabled:opacity-20" aria-label="Move down">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <div className="min-w-0 flex-1">
              {editingCustomSectionId === id ? (
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updatePitCustomSection(id, { title: e.target.value })}
                  onBlur={() => setEditingCustomSectionId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setEditingCustomSectionId(null);
                    }
                  }}
                  placeholder="Section title"
                  autoFocus
                  className="w-full border-0 bg-transparent px-0 py-0 text-sm font-semibold text-white outline-none placeholder:text-gray-600"
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <div
                    role="button"
                    tabIndex={0}
                    onDoubleClick={() => setEditingCustomSectionId(id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEditingCustomSectionId(id);
                      }
                    }}
                    className="min-w-0 cursor-text outline-none"
                    title="Double-click to edit title"
                  >
                    <h4 className="truncate text-sm font-semibold text-white">
                      {section.title.trim() || "Untitled Section"}
                    </h4>
                  </div>
                  <EditIconButton label="Edit title" onClick={() => setEditingCustomSectionId(id)} />
                </div>
              )}
              {editingCustomSectionDescriptionId === id ? (
                <textarea
                  value={section.description ?? ""}
                  onChange={(e) => updatePitCustomSection(id, { description: e.target.value })}
                  onBlur={() => setEditingCustomSectionDescriptionId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingCustomSectionDescriptionId(null);
                    }
                  }}
                  placeholder="Add a short description for this section."
                  rows={2}
                  autoFocus={editingCustomSectionId !== id}
                  className="mt-1.5 min-h-[2.75rem] w-full resize-none border-0 bg-transparent px-0 py-0 text-xs leading-5 text-gray-300 outline-none placeholder:text-gray-500"
                />
              ) : (
                <div className="mt-1.5 inline-flex max-w-full items-start gap-1.5 align-top">
                  <div
                    role="button"
                    tabIndex={0}
                    onDoubleClick={() => setEditingCustomSectionDescriptionId(id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEditingCustomSectionDescriptionId(id);
                      }
                    }}
                    className="min-w-0 max-w-full cursor-text outline-none"
                    title="Double-click to edit description"
                  >
                    <p className={`break-words whitespace-pre-wrap text-xs leading-5 ${section.description?.trim() ? "text-gray-300" : "text-gray-500"}`}>
                      {section.description?.trim() || "Add a short description for this section."}
                    </p>
                  </div>
                  <EditIconButton
                    label="Edit description"
                    onClick={() => setEditingCustomSectionDescriptionId(id)}
                    className="mt-0.5"
                  />
                </div>
              )}
            </div>
            <button type="button" onClick={() => deletePitCustomSection(id)} className="shrink-0 text-gray-600 hover:text-red-400 transition" aria-label="Remove section">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="ml-7 mb-2 space-y-2">
            {section.fields.map((field, fIdx) => {
              const patchField = (patch: Partial<CustomFieldDef>) =>
                updatePitCustomSection(id, { fields: section.fields.map((f, i) => i === fIdx ? { ...f, ...patch } : f) });
              const moveOption = (oIdx: number, dir: -1 | 1) => {
                const opts = [...(field.options ?? [])];
                const t = oIdx + dir;
                if (t < 0 || t >= opts.length) return;
                [opts[oIdx], opts[t]] = [opts[t], opts[oIdx]];
                patchField({ options: opts });
              };
              return (
                <div key={field.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => patchField({ label: e.target.value })}
                      placeholder="Field label"
                      className="dashboard-input flex-1 px-2 py-1.5 text-xs"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => patchField({ type: e.target.value as CustomFieldType, ...(e.target.value === "multi-select" && !field.options ? { options: [] } : {}) })}
                      className="dashboard-input w-32 shrink-0 px-2 py-1.5 text-xs"
                    >
                      <option value="counter">Counter</option>
                      <option value="toggle">Toggle</option>
                      <option value="multi-select">Multi-Select</option>
                      <option value="rating">Rating (★)</option>
                      <option value="text">Text</option>
                    </select>
                    <button type="button" onClick={() => updatePitCustomSection(id, { fields: section.fields.filter((_, i) => i !== fIdx) })} className="shrink-0 text-gray-600 hover:text-red-400 transition" aria-label="Remove field">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  {field.type === "counter" && (
                    <div className="flex items-center gap-4 pl-0.5">
                      <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        Min
                        <input type="number" value={field.min ?? 0} onChange={(e) => patchField({ min: Number(e.target.value) })} className="dashboard-input w-16 px-2 py-1 text-xs" />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        Max
                        <input type="number" value={field.max ?? ""} onChange={(e) => patchField({ max: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="none" className="dashboard-input w-16 px-2 py-1 text-xs" />
                      </label>
                    </div>
                  )}

                  {field.type === "rating" && (
                    <div className="flex items-center gap-2 pl-0.5">
                      <span className="text-xs text-gray-500">Max stars</span>
                      <div className="flex gap-1">
                        {[3, 4, 5, 6, 7].map((n) => (
                          <button key={n} type="button" onClick={() => patchField({ maxStars: n })} className={`w-7 h-7 rounded text-xs font-medium transition ${(field.maxStars ?? 5) === n ? "bg-white/20 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {field.type === "text" && (
                    <input type="text" value={field.placeholder ?? ""} onChange={(e) => patchField({ placeholder: e.target.value })} placeholder="Placeholder text (optional)" className="dashboard-input w-full px-2 py-1 text-xs text-gray-400" />
                  )}

                  {field.type === "multi-select" && (
                    <div className="space-y-1.5 pt-0.5">
                      {(field.options ?? []).map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5">
                          <div className="flex flex-col gap-0.5">
                            <button type="button" disabled={oIdx === 0} onClick={() => moveOption(oIdx, -1)} className="text-gray-600 hover:text-gray-300 disabled:opacity-20" aria-label="Move up">
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                            <button type="button" disabled={oIdx === (field.options?.length ?? 0) - 1} onClick={() => moveOption(oIdx, 1)} className="text-gray-600 hover:text-gray-300 disabled:opacity-20" aria-label="Move down">
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => patchField({ options: (field.options ?? []).map((o, oi) => oi === oIdx ? { ...o, label: e.target.value } : o) })}
                            placeholder={`Option ${oIdx + 1}`}
                            className="dashboard-input flex-1 px-2 py-1 text-xs"
                          />
                          <button type="button" onClick={() => patchField({ options: (field.options ?? []).filter((_, i) => i !== oIdx) })} className="text-gray-600 hover:text-red-400 transition" aria-label="Remove option">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => patchField({ options: [...(field.options ?? []), { key: "", label: "" }] })} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add option
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => updatePitCustomSection(id, { fields: [...section.fields, { id: `field-${Date.now()}`, label: "", type: "counter" }] })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-gray-300 transition hover:bg-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add field
            </button>
          </div>
        </div>
        <AddSectionDivider onAdd={() => addPitCustomSectionAt(index + 1)} />
      </Fragment>
    );
  };

  return (
    <div>
      {/* Toast */}
      {status && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 ${status.ok ? "border border-teal-500/30 bg-[#03070a] text-teal-200" : "border border-red-500/30 bg-[#03070a] text-red-200"}`}>
          {status.ok ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-teal-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )}
          {status.msg}
        </div>
      )}

      <ConfirmDialog
        open={resetTarget !== null}
        title={resetTarget === "match" ? "Reset match form?" : "Reset pit form?"}
        description={
          resetTarget === "match"
            ? "This reverts the current event's match scouting form and ability questions back to the team template. Pit scouting settings stay unchanged."
            : "This reverts the current event's pit scouting form back to the team template. Match scouting settings stay unchanged."
        }
        confirmLabel={isResetPending ? "Resetting..." : "Reset form"}
        cancelLabel="Cancel"
        tone="warning"
        confirmDisabled={isResetPending}
        onConfirm={() => {
          if (!resetTarget) return;
          void handleReset(resetTarget);
        }}
        onClose={() => {
          if (isResetPending) return;
          setResetTarget(null);
        }}
      />

      {/* Tabs */}
      <div data-tour="customize-tabs" className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Match scouting tab */}
      {activeTab === "match" && (
        <div data-tour="customize-match-panel" className="rounded-2xl dashboard-panel dashboard-card p-5">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">Match Scouting Form</h3>
              <p className="mt-1 text-sm text-gray-400">
                Options, ordering, and custom sections shown on the live match scouting form.
              </p>
            </div>
            <ResetSectionButton label="Reset" onClick={() => setResetTarget("match")} />
          </div>
          {unifiedOrder.map((id, index) => {
            if (isDefaultSectionId(id)) {
              return (
                <Fragment key={id}>
                  {renderMatchSection(id, index)}
                  <AddSectionDivider onAdd={() => addCustomSectionAt(index + 1)} />
                </Fragment>
              );
            }
            const section = customSectionsMap[id];
            if (!section) return null;
            return (
            <Fragment key={id}>
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex shrink-0 flex-col gap-0.5 mt-0.5">
                    <button type="button" disabled={index === 0} onClick={() => moveSection(index, -1)} className="text-gray-600 transition-colors hover:text-gray-300 disabled:opacity-20" aria-label="Move up">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button type="button" disabled={index === unifiedOrder.length - 1} onClick={() => moveSection(index, 1)} className="text-gray-600 transition-colors hover:text-gray-300 disabled:opacity-20" aria-label="Move down">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingCustomSectionId === id ? (
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateCustomSection(id, { title: e.target.value })}
                        onBlur={() => setEditingCustomSectionId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setEditingCustomSectionId(null);
                          }
                        }}
                        placeholder="Section title"
                        autoFocus
                        className="w-full border-0 bg-transparent px-0 py-0 text-sm font-semibold text-white outline-none placeholder:text-gray-600"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div
                          role="button"
                          tabIndex={0}
                          onDoubleClick={() => setEditingCustomSectionId(id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setEditingCustomSectionId(id);
                            }
                          }}
                          className="min-w-0 cursor-text outline-none"
                          title="Double-click to edit title"
                        >
                          <h4 className="truncate text-sm font-semibold text-white">
                            {section.title.trim() || "Untitled Section"}
                          </h4>
                        </div>
                        <EditIconButton label="Edit title" onClick={() => setEditingCustomSectionId(id)} />
                      </div>
                    )}
                    {editingCustomSectionDescriptionId === id ? (
                      <textarea
                        value={section.description ?? ""}
                        onChange={(e) => updateCustomSection(id, { description: e.target.value })}
                        onBlur={() => setEditingCustomSectionDescriptionId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingCustomSectionDescriptionId(null);
                          }
                        }}
                        placeholder="Add a short description for this section."
                        rows={2}
                        autoFocus={editingCustomSectionId !== id}
                        className="mt-1.5 min-h-[2.75rem] w-full resize-none border-0 bg-transparent px-0 py-0 text-xs leading-5 text-gray-300 outline-none placeholder:text-gray-500"
                      />
                    ) : (
                      <div className="mt-1.5 inline-flex max-w-full items-start gap-1.5 align-top">
                        <div
                          role="button"
                          tabIndex={0}
                          onDoubleClick={() => setEditingCustomSectionDescriptionId(id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setEditingCustomSectionDescriptionId(id);
                            }
                          }}
                          className="min-w-0 max-w-full cursor-text outline-none"
                          title="Double-click to edit description"
                        >
                          <p className={`break-words whitespace-pre-wrap text-xs leading-5 ${section.description?.trim() ? "text-gray-300" : "text-gray-500"}`}>
                            {section.description?.trim() || "Add a short description for this section."}
                          </p>
                        </div>
                        <EditIconButton
                          label="Edit description"
                          onClick={() => setEditingCustomSectionDescriptionId(id)}
                          className="mt-0.5"
                        />
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => deleteCustomSection(id)} className="shrink-0 text-gray-600 hover:text-red-400 transition" aria-label="Remove section">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="ml-7 mb-2 space-y-2">
                  {section.fields.map((field, fIdx) => {
                    const patchField = (patch: Partial<CustomFieldDef>) =>
                      updateCustomSection(id, { fields: section.fields.map((f, i) => i === fIdx ? { ...f, ...patch } : f) });
                    const moveOption = (oIdx: number, dir: -1 | 1) => {
                      const opts = [...(field.options ?? [])];
                      const t = oIdx + dir;
                      if (t < 0 || t >= opts.length) return;
                      [opts[oIdx], opts[t]] = [opts[t], opts[oIdx]];
                      patchField({ options: opts });
                    };
                    return (
                      <div key={field.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2.5">
                        {/* Label + type + remove */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => patchField({ label: e.target.value })}
                            placeholder="Field label"
                            className="dashboard-input flex-1 px-2 py-1.5 text-xs"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => patchField({ type: e.target.value as CustomFieldType, ...(e.target.value === "multi-select" && !field.options ? { options: [] } : {}) })}
                            className="dashboard-input w-32 shrink-0 px-2 py-1.5 text-xs"
                          >
                            <option value="counter">Counter</option>
                            <option value="toggle">Toggle</option>
                            <option value="multi-select">Multi-Select</option>
                            <option value="rating">Rating (★)</option>
                            <option value="text">Text</option>
                          </select>
                          <button type="button" onClick={() => updateCustomSection(id, { fields: section.fields.filter((_, i) => i !== fIdx) })} className="shrink-0 text-gray-600 hover:text-red-400 transition" aria-label="Remove field">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>

                        {/* Counter: min / max */}
                        {field.type === "counter" && (
                          <div className="flex items-center gap-4 pl-0.5">
                            <label className="flex items-center gap-1.5 text-xs text-gray-500">
                              Min
                              <input type="number" value={field.min ?? 0} onChange={(e) => patchField({ min: Number(e.target.value) })} className="dashboard-input w-16 px-2 py-1 text-xs" />
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-gray-500">
                              Max
                              <input type="number" value={field.max ?? ""} onChange={(e) => patchField({ max: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="none" className="dashboard-input w-16 px-2 py-1 text-xs" />
                            </label>
                          </div>
                        )}

                        {/* Rating: max stars */}
                        {field.type === "rating" && (
                          <div className="flex items-center gap-2 pl-0.5">
                            <span className="text-xs text-gray-500">Max stars</span>
                            <div className="flex gap-1">
                              {[3, 4, 5, 6, 7].map((n) => (
                                <button key={n} type="button" onClick={() => patchField({ maxStars: n })} className={`w-7 h-7 rounded text-xs font-medium transition ${(field.maxStars ?? 5) === n ? "bg-white/20 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}>
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Text: placeholder */}
                        {field.type === "text" && (
                          <input type="text" value={field.placeholder ?? ""} onChange={(e) => patchField({ placeholder: e.target.value })} placeholder="Placeholder text (optional)" className="dashboard-input w-full px-2 py-1 text-xs text-gray-400" />
                        )}

                        {/* Multi-select: options with reorder */}
                        {field.type === "multi-select" && (
                          <div className="space-y-1.5 pt-0.5">
                            {(field.options ?? []).map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-1.5">
                                <div className="flex flex-col gap-0.5">
                                  <button type="button" disabled={oIdx === 0} onClick={() => moveOption(oIdx, -1)} className="text-gray-600 hover:text-gray-300 disabled:opacity-20" aria-label="Move up">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                  </button>
                                  <button type="button" disabled={oIdx === (field.options?.length ?? 0) - 1} onClick={() => moveOption(oIdx, 1)} className="text-gray-600 hover:text-gray-300 disabled:opacity-20" aria-label="Move down">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={opt.label}
                                  onChange={(e) => patchField({ options: (field.options ?? []).map((o, oi) => oi === oIdx ? { ...o, label: e.target.value } : o) })}
                                  placeholder={`Option ${oIdx + 1}`}
                                  className="dashboard-input flex-1 px-2 py-1 text-xs"
                                />
                                <button type="button" onClick={() => patchField({ options: (field.options ?? []).filter((_, i) => i !== oIdx) })} className="text-gray-600 hover:text-red-400 transition" aria-label="Remove option">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => patchField({ options: [...(field.options ?? []), { key: "", label: "" }] })} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Add option
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => updateCustomSection(id, { fields: [...section.fields, { id: `field-${Date.now()}`, label: "", type: "counter" }] })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-gray-300 transition hover:bg-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add field
                  </button>
                </div>
              </div>
              <AddSectionDivider onAdd={() => addCustomSectionAt(index + 1)} />
            </Fragment>
            );
          })}

          <div className="pt-5 mt-2 flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" loading={isPending} onClick={handleSaveMatch}>Save match form</Button>
            <p className="text-xs text-gray-500">Applies to all scouts at this event.</p>
          </div>
        </div>
      )}

      {/* Pit scouting tab */}
      {activeTab === "pit" && (
        <div data-tour="customize-pit-panel" className="rounded-2xl dashboard-panel dashboard-card p-5 space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">Pit Scouting Form</h3>
              <p className="mt-1 text-sm text-gray-400">
                Options shown on the pit scouting form accessed from team profiles.
              </p>
            </div>
            <ResetSectionButton label="Reset" onClick={() => setResetTarget("pit")} />
          </div>
          <div className="space-y-4">
            {pitUnifiedOrder.map((id, index) => {
              if (isPitSectionId(id)) {
                return (
                  <Fragment key={id}>
                    {renderPitSection(id, index)}
                    <AddSectionDivider onAdd={() => addPitCustomSectionAt(index + 1)} />
                  </Fragment>
                );
              }

              return renderPitCustomSection(id, index);
            })}
          </div>
          <div className="pt-6 flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" loading={isPending} onClick={handleSavePit}>Save pit form</Button>
            <p className="text-xs text-gray-500">Applies to all scouts at this event.</p>
          </div>
        </div>
      )}
    </div>
  );
}
