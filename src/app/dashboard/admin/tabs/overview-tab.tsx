"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resetAllTeamAiCooldowns,
  updateEventSyncMinYear,
  updateTeamAiPromptLimits,
} from "@/lib/staff-actions";
import { Button } from "@/components/ui/button";
import { StaggerGroup, StaggerChild } from "@/components/ui/animate-in";
import { TEAM_AI_WINDOW_MS } from "@/lib/rate-limit";

interface OverviewTabProps {
  stats: {
    organizations: number;
    users: number;
    entries: number;
    matches: number;
    events: number;
  };
  eventSyncMinYear: number;
  teamAiPromptLimits: {
    free: number;
    supporter: number;
  };
}

const StatIcon = ({ type }: { type: string }) => {
  const props = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "orgs":
      return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "users":
      return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "entries":
      return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case "matches":
      return <svg {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "events":
      return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    default:
      return null;
  }
};

export function OverviewTab({
  stats,
  eventSyncMinYear,
  teamAiPromptLimits,
}: OverviewTabProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [freeLimit, setFreeLimit] = useState(teamAiPromptLimits.free);
  const [supporterLimit, setSupporterLimit] = useState(teamAiPromptLimits.supporter);
  const aiWindowHours = Math.round(TEAM_AI_WINDOW_MS / (60 * 60 * 1000));

  async function handleUpdateEventWindow(formData: FormData) {
    const result = await updateEventSyncMinYear(formData);
    if (result?.error) {
      setStatus(result.error);
      return;
    }
    setStatus("Event sync window updated.");
    startTransition(() => router.refresh());
  }

  async function handleSaveAiLimits() {
    const formData = new FormData();
    formData.set("freeAiLimit", String(freeLimit));
    formData.set("supporterAiLimit", String(supporterLimit));

    const result = await updateTeamAiPromptLimits(formData);
    if (!("success" in result)) {
      const message =
        "error" in result
          ? result.error ?? "Failed to update AI token limits."
          : "Website admin access required.";
      setStatus(message);
      return;
    }

    setStatus("AI token limits updated.");
    startTransition(() => router.refresh());
  }

  async function handleResetAllAiCooldowns() {
    if (!window.confirm("Reset AI cooldowns for all teams now?")) {
      return;
    }

    const result = await resetAllTeamAiCooldowns();
    if (!("success" in result)) {
      const message =
        "error" in result
          ? result.error ?? "Failed to reset AI cooldowns."
          : "Website admin access required.";
      setStatus(message);
      return;
    }

    setStatus(
      `Reset AI cooldowns for ${result.deleted} team bucket${
        result.deleted === 1 ? "" : "s"
      } (${result.backend}).`
    );
    startTransition(() => router.refresh());
  }

  const cards = [
    {
      key: "orgs",
      label: "Organizations",
      value: stats.organizations,
      sub: "Registered teams",
      color: "text-teal-400",
      ring: "ring-teal-500/20",
      bg: "bg-teal-500/10",
    },
    {
      key: "users",
      label: "Users",
      value: stats.users,
      sub: "Total accounts",
      color: "text-sky-400",
      ring: "ring-sky-500/20",
      bg: "bg-sky-500/10",
    },
    {
      key: "entries",
      label: "Scout Entries",
      value: stats.entries,
      sub: "All submissions",
      color: "text-violet-400",
      ring: "ring-violet-500/20",
      bg: "bg-violet-500/10",
    },
    {
      key: "matches",
      label: "Matches",
      value: stats.matches,
      sub: "Synced from TBA",
      color: "text-emerald-400",
      ring: "ring-emerald-500/20",
      bg: "bg-emerald-500/10",
    },
    {
      key: "events",
      label: "Events",
      value: stats.events,
      sub: "Synced from TBA",
      color: "text-teal-400",
      ring: "ring-teal-500/20",
      bg: "bg-teal-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Platform Overview</h2>
          <p className="text-xs text-gray-500">Site-wide metrics across all organizations.</p>
        </div>
      </div>

      {/* Stat cards */}
      <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((s) => (
          <StaggerChild key={s.key}>
            <div className={`group relative rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 ring-1 ${s.ring} transition-colors hover:bg-white/[0.05]`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">{s.label}</p>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>
                  <StatIcon type={s.key} />
                </div>
              </div>
              <p className={`mt-3 text-2xl font-bold tabular-nums ${s.color}`}>
                {s.value.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-600">{s.sub}</p>
            </div>
          </StaggerChild>
        ))}
      </StaggerGroup>

      {/* Config sections */}
      <div className="space-y-4">
        {/* Event Sync Window */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white">Event Sync Window</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Teams can sync events from January 1 of the selected year up to today.
              </p>
              <form action={handleUpdateEventWindow} className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="eventSyncMinYear" className="block text-[11px] font-medium text-gray-500">
                    Earliest year
                  </label>
                  <input
                    id="eventSyncMinYear"
                    name="eventSyncMinYear"
                    type="number"
                    min={1992}
                    defaultValue={eventSyncMinYear}
                    className="dashboard-input mt-1 w-28 px-3 py-1.5 text-sm"
                    required
                  />
                </div>
                <Button type="submit" size="sm" loading={isPending}>
                  Save
                </Button>
              </form>
              <p className="mt-2 text-[11px] text-gray-600">
                Current window: {eventSyncMinYear}-01-01 to today.
              </p>
            </div>
          </div>
        </div>

        {/* AI Token Limits */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H7"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white">Team AI Token Limits</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Shared token caps per plan per {aiWindowHours}-hour window. Applies to strategy chat, pick lists, and match briefs.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-medium text-gray-500">Free plan</span>
                  <input
                    type="number"
                    min={500}
                    max={200000}
                    value={freeLimit}
                    onChange={(e) =>
                      setFreeLimit(Math.max(500, Math.min(200000, Number(e.target.value) || 500)))
                    }
                    className="dashboard-input mt-1 w-full px-3 py-1.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-gray-500">Supporter plan</span>
                  <input
                    type="number"
                    min={500}
                    max={200000}
                    value={supporterLimit}
                    onChange={(e) =>
                      setSupporterLimit(Math.max(500, Math.min(200000, Number(e.target.value) || 500)))
                    }
                    className="dashboard-input mt-1 w-full px-3 py-1.5 text-sm"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" loading={isPending} onClick={handleSaveAiLimits}>
                  Save limits
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={isPending}
                  onClick={handleResetAllAiCooldowns}
                >
                  Reset all cooldowns
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status message */}
      {status && (
        <div className="flex items-center gap-2 rounded-lg border border-teal-500/20 bg-teal-500/8 px-3 py-2.5 text-sm text-teal-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {status}
        </div>
      )}
    </div>
  );
}
