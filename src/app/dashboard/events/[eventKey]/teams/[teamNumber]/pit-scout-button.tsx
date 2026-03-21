"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { PitScoutFormConfig } from "@/lib/platform-settings";

interface PitScoutButtonProps {
  eventId: string;
  eventKey: string;
  teamNumber: number;
  orgId: string;
  userId: string;
  config: PitScoutFormConfig;
}

export function PitScoutButton({
  eventId,
  eventKey,
  teamNumber,
  orgId,
  userId,
  config,
}: PitScoutButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Form state
  const [drivetrain, setDrivetrain] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [height, setHeight] = useState("");
  const [intakeTypes, setIntakeTypes] = useState<string[]>([]);
  const [scoringRanges, setScoringRanges] = useState<string[]>([]);
  const [estimatedCycles, setEstimatedCycles] = useState("");
  const [climbCapability, setClimbCapability] = useState("");
  const [autoDescription, setAutoDescription] = useState("");
  const [autoFuelScored, setAutoFuelScored] = useState("");
  const [notes, setNotes] = useState("");

  // Load existing pit scout data when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    supabase
      .from("pit_scout_entries")
      .select("*")
      .eq("org_id", orgId)
      .eq("event_id", eventId)
      .eq("team_number", teamNumber)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
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
          setAutoDescription(data.auto_description ?? "");
          setAutoFuelScored(data.auto_fuel_scored?.toString() ?? "");
          setNotes(data.notes ?? "");
        }
        setLoading(false);
      });
  }, [open, orgId, eventId, teamNumber]);

  function toggleArrayValue(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
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
      auto_description: autoDescription.trim() || null,
      auto_fuel_scored: autoFuelScored ? parseInt(autoFuelScored, 10) : null,
      notes: notes.trim() || null,
    };

    const result = existingId
      ? await supabase.from("pit_scout_entries").update(entry).eq("id", existingId)
      : await supabase.from("pit_scout_entries").upsert(entry, {
          onConflict: "org_id,event_id,team_number",
        });

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setOpen(false), 800);
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
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-200 transition hover:bg-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z" />
        </svg>
        Pit Scout
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
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Pit Scout: Team {teamNumber}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Record what you observe in the pits
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

                      {/* Drivetrain */}
                      <fieldset>
                        <legend className="text-sm font-medium text-gray-300 mb-2">Drivetrain</legend>
                        <div className="grid grid-cols-2 gap-2">
                          {config.drivetrainOptions.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setDrivetrain(drivetrain === opt ? "" : opt)}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                drivetrain === opt
                                  ? "border-teal-500/50 bg-teal-500/15 text-teal-200"
                                  : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      {/* Dimensions */}
                      <fieldset>
                        <legend className="text-sm font-medium text-gray-300 mb-2">Robot Dimensions (inches)</legend>
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
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-teal-500/50 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </fieldset>

                      {/* Intake Type */}
                      <fieldset>
                        <legend className="text-sm font-medium text-gray-300 mb-2">Intake Type</legend>
                        <div className="flex gap-2">
                          {config.intakeOptions.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => toggleArrayValue(intakeTypes, opt.key, setIntakeTypes)}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition flex-1 ${
                                intakeTypes.includes(opt.key)
                                  ? "border-teal-500/50 bg-teal-500/15 text-teal-200"
                                  : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      {/* Scoring Capability */}
                      <fieldset>
                        <legend className="text-sm font-medium text-gray-300 mb-2">Scoring Range</legend>
                        <div className="flex gap-2 mb-3">
                          {config.scoringRangeOptions.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => toggleArrayValue(scoringRanges, opt.key, setScoringRanges)}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition flex-1 ${
                                scoringRanges.includes(opt.key)
                                  ? "border-teal-500/50 bg-teal-500/15 text-teal-200"
                                  : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                              }`}
                            >
                              {opt.label}
                            </button>
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
                            className="w-full max-w-[120px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-teal-500/50 focus:outline-none"
                          />
                        </div>
                      </fieldset>

                      {/* Climb */}
                      <fieldset>
                        <legend className="text-sm font-medium text-gray-300 mb-2">Climb Capability</legend>
                        <div className="grid grid-cols-4 gap-2">
                          {config.climbOptions.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setClimbCapability(climbCapability === opt ? "" : opt)}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                climbCapability === opt
                                  ? "border-teal-500/50 bg-teal-500/15 text-teal-200"
                                  : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      {/* Auto */}
                      <fieldset>
                        <legend className="text-sm font-medium text-gray-300 mb-2">Auto Routine</legend>
                        <textarea
                          value={autoDescription}
                          onChange={(e) => setAutoDescription(e.target.value)}
                          placeholder="What does their auto do?"
                          rows={2}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-teal-500/50 focus:outline-none resize-none"
                        />
                        <div className="mt-2">
                          <label className="block text-xs text-gray-400 mb-1">FUEL scored in auto</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={autoFuelScored}
                            onChange={(e) => setAutoFuelScored(e.target.value)}
                            placeholder="0"
                            className="w-full max-w-[120px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-teal-500/50 focus:outline-none"
                          />
                        </div>
                      </fieldset>

                      {/* Notes */}
                      <fieldset>
                        <legend className="text-sm font-medium text-gray-300 mb-2">Team Strengths / Notes</legend>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Build quality, driver skill, strategy preferences, known issues..."
                          rows={3}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-teal-500/50 focus:outline-none resize-none"
                        />
                      </fieldset>
                    </>
                  )}
                </div>

                {/* Footer */}
                {!loading && (
                  <div className="border-t border-white/10 px-6 py-4 flex items-center justify-end gap-3">
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
                      disabled={saving || saved}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${
                        saved
                          ? "bg-green-600 text-white"
                          : "bg-teal-500 hover:bg-teal-400 text-white"
                      }`}
                    >
                      {saved ? "Saved!" : saving ? "Saving..." : existingId ? "Update" : "Save"}
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
