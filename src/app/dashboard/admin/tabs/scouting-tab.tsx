"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  updateScoutingAbilityQuestions,
  updateScoutingFormConfig,
  updatePitScoutFormConfig,
} from "@/lib/staff-actions";
import { Button } from "@/components/ui/button";
import type { FormOptionItem, ScoutingFormConfig, PitScoutFormConfig } from "@/lib/platform-settings";

interface ScoutingTabProps {
  scoutingAbilityQuestions: string[];
  formConfig: ScoutingFormConfig;
  pitScoutConfig: PitScoutFormConfig;
}

/* ── Reusable option-list editor ── */

function OptionListEditor({
  title,
  description,
  items,
  onChange,
  keyPlaceholder = "key",
  labelPlaceholder = "Label",
}: {
  title: string;
  description: string;
  items: FormOptionItem[];
  onChange: (items: FormOptionItem[]) => void;
  keyPlaceholder?: string;
  labelPlaceholder?: string;
}) {
  const updateItem = (index: number, field: "key" | "label", value: string) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(next);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      onChange([{ key: "", label: "" }]);
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, { key: "", label: "" }]);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveItem(index, -1)}
                className="text-gray-500 hover:text-gray-300 disabled:opacity-20"
                aria-label="Move up"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => moveItem(index, 1)}
                className="text-gray-500 hover:text-gray-300 disabled:opacity-20"
                aria-label="Move down"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <input
              type="text"
              value={item.key}
              onChange={(e) => updateItem(index, "key", e.target.value)}
              placeholder={keyPlaceholder}
              className="dashboard-input w-28 shrink-0 px-2 py-1.5 text-xs font-mono"
            />
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateItem(index, "label", e.target.value)}
              placeholder={labelPlaceholder}
              className="dashboard-input flex-1 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="rounded-lg border border-red-400/30 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/20"
              aria-label="Remove"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add option
      </button>
    </div>
  );
}

/* ── String list editor (for start positions) ── */

function StringListEditor({
  title,
  description,
  items,
  onChange,
  placeholder = "Value",
}: {
  title: string;
  description: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const updateItem = (index: number, value: string) => {
    const next = items.map((item, i) => (i === index ? value : item));
    onChange(next);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => onChange([...items, ""]);

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveItem(index, -1)}
                className="text-gray-500 hover:text-gray-300 disabled:opacity-20"
                aria-label="Move up"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => moveItem(index, 1)}
                className="text-gray-500 hover:text-gray-300 disabled:opacity-20"
                aria-label="Move down"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="dashboard-input flex-1 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="rounded-lg border border-red-400/30 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/20"
              aria-label="Remove"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add position
      </button>
    </div>
  );
}

/* ── Main Scouting Tab ── */

type TabId = "match" | "pit";

export function ScoutingTab({
  scoutingAbilityQuestions,
  formConfig,
  pitScoutConfig,
}: ScoutingTabProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("match");
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [questions, setQuestions] = useState<string[]>(
    scoutingAbilityQuestions.length > 0 ? scoutingAbilityQuestions : [""]
  );
  const [intakeOptions, setIntakeOptions] = useState<FormOptionItem[]>(formConfig.intakeOptions);
  const [climbLevelOptions, setClimbLevelOptions] = useState<FormOptionItem[]>(formConfig.climbLevelOptions);
  const [shootingRangeOptions, setShootingRangeOptions] = useState<FormOptionItem[]>(formConfig.shootingRangeOptions);
  const [autoStartPositions, setAutoStartPositions] = useState<string[]>(formConfig.autoStartPositions);
  const [ratingFields, setRatingFields] = useState<FormOptionItem[]>(formConfig.ratingFields);

  const [pitDrivetrainOptions, setPitDrivetrainOptions] = useState<string[]>(pitScoutConfig.drivetrainOptions);
  const [pitIntakeOptions, setPitIntakeOptions] = useState<FormOptionItem[]>(pitScoutConfig.intakeOptions);
  const [pitScoringRangeOptions, setPitScoringRangeOptions] = useState<FormOptionItem[]>(pitScoutConfig.scoringRangeOptions);
  const [pitClimbOptions, setPitClimbOptions] = useState<string[]>(pitScoutConfig.climbOptions);
  const [pitFuelOutputOptions, setPitFuelOutputOptions] = useState<string[]>(pitScoutConfig.fuelOutputOptions);

  const showStatus = useCallback((msg: string, ok = true) => {
    setStatus({ msg, ok });
    setTimeout(() => setStatus(null), 3500);
  }, []);

  async function handleSaveMatch() {
    const config: ScoutingFormConfig = { intakeOptions, climbLevelOptions, shootingRangeOptions, autoStartPositions, ratingFields };
    const normalized = questions.map((q) => q.trim().replace(/\s+/g, " ")).filter((q) => q.length > 0);

    const fd = new FormData();
    fd.set("formConfigJson", JSON.stringify(config));
    const r1 = await updateScoutingFormConfig(fd);
    if (r1?.error) { showStatus(r1.error, false); return; }

    const fd2 = new FormData();
    fd2.set("questionsJson", JSON.stringify(normalized));
    const r2 = await updateScoutingAbilityQuestions(fd2);
    if (r2?.error) { showStatus(r2.error, false); return; }

    showStatus("Match scouting form saved.");
    startTransition(() => router.refresh());
  }

  async function handleSavePit() {
    const config: PitScoutFormConfig = {
      drivetrainOptions: pitDrivetrainOptions,
      intakeOptions: pitIntakeOptions,
      scoringRangeOptions: pitScoringRangeOptions,
      climbOptions: pitClimbOptions,
      fuelOutputOptions: pitFuelOutputOptions,
    };
    const fd = new FormData();
    fd.set("pitScoutConfigJson", JSON.stringify(config));
    const result = await updatePitScoutFormConfig(fd);
    if (result?.error) { showStatus(result.error, false); return; }
    showStatus("Pit scout form saved.");
    startTransition(() => router.refresh());
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "match", label: "Match Scouting" },
    { id: "pit", label: "Pit Scouting" },
  ];

  return (
    <div>
      {status && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium dashboard-panel ${status.ok ? "border-teal-500/30 bg-teal-500/10 text-teal-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
          <div className="flex items-center gap-2">
            {status.ok ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-teal-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            )}
            {status.msg}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Match Scouting tab */}
      {activeTab === "match" && (
        <div className="space-y-6">
          <div className="rounded-2xl dashboard-panel dashboard-card p-5 space-y-8">
            <div>
              <h3 className="text-base font-semibold text-white">Form Field Options</h3>
              <p className="mt-1 text-sm text-gray-400">
                Default options for multi-select groups on the match scouting form. Each item needs a <code className="rounded bg-white/5 px-1 text-xs text-gray-300">key</code> (stored in DB) and a <code className="rounded bg-white/5 px-1 text-xs text-gray-300">label</code> (shown to scouts).
              </p>
            </div>
            <div className="border-t border-white/5 pt-6">
              <OptionListEditor title="Intake Methods" description="Teleop: how the robot picks up game pieces." items={intakeOptions} onChange={setIntakeOptions} keyPlaceholder="e.g. ground" labelPlaceholder="e.g. Ground Intake" />
            </div>
            <div className="border-t border-white/5 pt-6">
              <OptionListEditor title="Climb Levels" description="Endgame: climb stages the robot can reach." items={climbLevelOptions} onChange={setClimbLevelOptions} keyPlaceholder="e.g. level_1" labelPlaceholder="e.g. Level 1" />
            </div>
            <div className="border-t border-white/5 pt-6">
              <OptionListEditor title="Shooting Ranges" description="Ratings: effective shooting distances." items={shootingRangeOptions} onChange={setShootingRangeOptions} keyPlaceholder="e.g. close" labelPlaceholder="e.g. Close Range" />
            </div>
            <div className="border-t border-white/5 pt-6">
              <StringListEditor title="Auto Start Positions" description="Autonomous: position buttons for robot start." items={autoStartPositions} onChange={setAutoStartPositions} placeholder="e.g. left" />
            </div>
            <div className="border-t border-white/5 pt-6">
              <OptionListEditor title="Star Rating Fields" description="Ratings: star-rating categories. Key must be one of: defense, cycle_time, shooting_reliability, reliability." items={ratingFields} onChange={setRatingFields} keyPlaceholder="e.g. defense" labelPlaceholder="e.g. Defense Ability" />
            </div>
            <div className="border-t border-white/5 pt-6">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">Ability Questions</h4>
                  <p className="mt-0.5 text-xs text-gray-400">Yes/No questions shown at the end of every scouting form.</p>
                </div>
                <div className="space-y-2">
                  {questions.map((question, index) => (
                    <div key={`question-${index}`} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestions((prev) => prev.map((item, i) => (i === index ? e.target.value : item)))}
                        placeholder="e.g. Can cross the charge station?"
                        className="dashboard-input w-full px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setQuestions((prev) => prev.length <= 1 ? [""] : prev.filter((_, i) => i !== index))}
                        className="rounded-lg border border-red-400/30 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/20"
                        aria-label="Remove"
                      >
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
            </div>
            <div className="border-t border-white/5 pt-6 flex flex-wrap items-center gap-3">
              <Button type="button" size="sm" loading={isPending} onClick={handleSaveMatch}>
                Save match form
              </Button>
              <p className="text-xs text-gray-500">These are global defaults. Captains can override per event.</p>
            </div>
          </div>
        </div>
      )}

      {/* Pit Scouting tab */}
      {activeTab === "pit" && (
        <div className="space-y-6">
          <div className="rounded-2xl dashboard-panel dashboard-card p-5 space-y-8">
            <div>
              <h3 className="text-base font-semibold text-white">Pit Scout Form Options</h3>
              <p className="mt-1 text-sm text-gray-400">
                Default options shown on the pit scouting form, accessed from each team&apos;s profile page.
              </p>
            </div>
            <div className="border-t border-white/5 pt-6">
              <StringListEditor title="Drivetrain Options" description="Single-select buttons for robot drivetrain type." items={pitDrivetrainOptions} onChange={setPitDrivetrainOptions} placeholder="e.g. Swerve" />
            </div>
            <div className="border-t border-white/5 pt-6">
              <OptionListEditor title="Intake Types" description="Multi-select buttons for how the robot picks up game pieces." items={pitIntakeOptions} onChange={setPitIntakeOptions} keyPlaceholder="e.g. ground" labelPlaceholder="e.g. Ground" />
            </div>
            <div className="border-t border-white/5 pt-6">
              <OptionListEditor title="Scoring Ranges" description="Multi-select buttons for effective scoring distances." items={pitScoringRangeOptions} onChange={setPitScoringRangeOptions} keyPlaceholder="e.g. close" labelPlaceholder="e.g. Close" />
            </div>
            <div className="border-t border-white/5 pt-6">
              <StringListEditor title="Climb Options" description="Single-select buttons for climb capability." items={pitClimbOptions} onChange={setPitClimbOptions} placeholder="e.g. Level 1" />
            </div>
            <div className="border-t border-white/5 pt-6">
              <StringListEditor title="Shooter Output Options" description="Single-select buttons for shooter output volume." items={pitFuelOutputOptions} onChange={setPitFuelOutputOptions} placeholder="e.g. Moderate" />
            </div>
            <div className="border-t border-white/5 pt-6 flex flex-wrap items-center gap-3">
              <Button type="button" size="sm" loading={isPending} onClick={handleSavePit}>
                Save pit form
              </Button>
              <p className="text-xs text-gray-500">These are global defaults. Captains can override per event.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
