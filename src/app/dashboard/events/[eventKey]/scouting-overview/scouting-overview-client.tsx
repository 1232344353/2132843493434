"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export type PitScoutInfo = {
  drivetrain: string | null;
  intakeTypes: string[];
  scoringRanges: string[];
  climbCapability: string | null;
  autoDescription: string | null;
  notes: string | null;
};

export type MatchEntryInfo = {
  id: string;
  matchId: string;
  matchLabel: string;
  autoScore: number;
  teleopScore: number;
  endgameScore: number;
  scoutedBy: string;
};

export type TeamScoutData = {
  teamNumber: number;
  teamName: string;
  entries: MatchEntryInfo[];
  pitScout: PitScoutInfo | null;
};

export function filterTeams(
  teams: TeamScoutData[],
  query: string,
  filter: "all" | "pit_scouted" | "low_coverage"
): TeamScoutData[] {
  let result = teams;

  if (query.trim()) {
    const q = query.trim().toLowerCase();
    result = result.filter(
      (t) =>
        String(t.teamNumber).includes(q) ||
        t.teamName.toLowerCase().includes(q)
    );
  }

  if (filter === "pit_scouted") {
    result = result.filter((t) => t.pitScout !== null);
  } else if (filter === "low_coverage") {
    result = result.filter((t) => t.entries.length < 2);
  }

  return result;
}

type Props = {
  eventId: string;
  eventKey: string;
  teamData: TeamScoutData[];
  totalEntries: number;
  pitScoutedCount: number;
};

export function ScoutingOverviewClient({
  eventId,
  teamData,
  totalEntries,
  pitScoutedCount,
}: Props) {
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [aiSummaries, setAiSummaries] = useState<Map<number | "event", string>>(
    new Map()
  );
  const [loadingAi, setLoadingAi] = useState<Set<number | "event">>(new Set());
  const [aiErrors, setAiErrors] = useState<Map<number | "event", string>>(
    new Map()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "pit_scouted" | "low_coverage">("all");
  const [showMoreMap, setShowMoreMap] = useState<Map<number, boolean>>(new Map());

  const filteredTeams = useMemo(
    () => filterTeams(teamData, searchQuery, filterMode),
    [teamData, searchQuery, filterMode]
  );

  function toggleExpand(teamNumber: number) {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamNumber)) next.delete(teamNumber);
      else next.add(teamNumber);
      return next;
    });
  }

  function toggleShowMore(teamNumber: number) {
    setShowMoreMap((prev) => {
      const next = new Map(prev);
      next.set(teamNumber, !prev.get(teamNumber));
      return next;
    });
  }

  async function fetchAiSummary(scope: "event" | "team", teamNumber?: number) {
    const key: number | "event" = scope === "event" ? "event" : teamNumber!;
    setLoadingAi((prev) => new Set(prev).add(key));
    setAiErrors((prev) => {
      const m = new Map(prev);
      m.delete(key);
      return m;
    });

    try {
      const res = await fetch("/api/strategy/scouting-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          scope,
          ...(scope === "team" ? { teamNumber } : {}),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { summary: string };
      setAiSummaries((prev) => new Map(prev).set(key, data.summary));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate summary";
      setAiErrors((prev) => new Map(prev).set(key, msg));
    } finally {
      setLoadingAi((prev) => {
        const s = new Set(prev);
        s.delete(key);
        return s;
      });
    }
  }

  const teamsWithFewEntries = teamData.filter((t) => t.entries.length < 2).length;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
            Scouting Reports
          </p>
          <h1 className="mt-1 text-xl font-bold text-white">Scouting Overview</h1>
          <p className="mt-1 text-xs text-gray-500">
            {totalEntries} match {totalEntries === 1 ? "entry" : "entries"}
            {" · "}
            {teamData.length} {teamData.length === 1 ? "team" : "teams"} scouted
            {" · "}
            {pitScoutedCount} pit {pitScoutedCount === 1 ? "scout" : "scouts"}
          </p>
        </div>
        <button
          onClick={() => fetchAiSummary("event")}
          disabled={loadingAi.has("event")}
          className="dashboard-action dashboard-action-holo flex items-center gap-2 disabled:opacity-60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {loadingAi.has("event") ? "Generating..." : "Generate Event Summary"}
        </button>
      </div>

      {/* AI event summary */}
      {(aiSummaries.has("event") || aiErrors.has("event")) && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.06] p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-gray-900"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-teal-400">AI Event Summary</span>
          </div>
          {aiErrors.has("event") ? (
            <p className="text-xs text-red-400">{aiErrors.get("event")}</p>
          ) : (
            <p className="text-sm leading-relaxed text-slate-300">
              {aiSummaries.get("event")}
            </p>
          )}
        </div>
      )}

      {/* Low coverage alert */}
      {teamsWithFewEntries > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 text-amber-400"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-xs text-amber-300">
            {teamsWithFewEntries}{" "}
            {teamsWithFewEntries === 1 ? "team has" : "teams have"} fewer than 2 entries.
          </p>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="dashboard-input flex-1 px-3 py-2 text-sm"
        />
        <select
          value={filterMode}
          onChange={(e) =>
            setFilterMode(e.target.value as "all" | "pit_scouted" | "low_coverage")
          }
          className="dashboard-input px-3 py-2 text-sm"
        >
          <option value="all">All Teams</option>
          <option value="pit_scouted">Pit Scouted</option>
          <option value="low_coverage">Low Coverage</option>
        </select>
      </div>

      {/* Team sections */}
      {filteredTeams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-gray-500">No teams match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTeams.map((team) => {
            const isExpanded = expandedTeams.has(team.teamNumber);
            const isLowCoverage = team.entries.length < 2;
            const teamAiKey = team.teamNumber;
            const hasAiSummary = aiSummaries.has(teamAiKey);
            const isLoadingAi = loadingAi.has(teamAiKey);
            const aiError = aiErrors.get(teamAiKey);
            const showMore = showMoreMap.get(team.teamNumber) ?? false;
            const visibleEntries = showMore
              ? team.entries
              : team.entries.slice(0, 2);

            return (
              <div
                key={team.teamNumber}
                className={`dashboard-panel overflow-hidden rounded-xl ${isLowCoverage ? "border-amber-500/20" : ""}`}
              >
                {/* Team header row */}
                <button
                  onClick={() => toggleExpand(team.teamNumber)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.02]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      Team {team.teamNumber}
                    </span>
                    <span className="text-xs text-gray-500">{team.teamName}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        isLowCoverage
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {team.entries.length}{" "}
                      {team.entries.length === 1 ? "entry" : "entries"}
                    </span>
                    {team.pitScout && (
                      <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                        Pit scouted
                      </span>
                    )}
                    {isLowCoverage && (
                      <span className="text-[10px] text-amber-400">Low coverage</span>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {!isExpanded && team.entries.length > 0 && !hasAiSummary && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(team.teamNumber);
                          void fetchAiSummary("team", team.teamNumber);
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-teal-400 transition hover:bg-teal-500/10"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Summarize
                      </button>
                    )}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="space-y-4 border-t border-white/[0.05] px-5 pb-5 pt-4">
                    {/* AI Summary */}
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                        AI Summary
                      </p>
                      {hasAiSummary ? (
                        <div className="flex gap-2 rounded-lg border border-teal-500/20 bg-teal-500/[0.06] p-3">
                          <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-400">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="7"
                              height="7"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="text-gray-900"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-300">
                            {aiSummaries.get(teamAiKey)}
                          </p>
                        </div>
                      ) : aiError ? (
                        <p className="text-xs text-red-400">{aiError}</p>
                      ) : (
                        <button
                          onClick={() => void fetchAiSummary("team", team.teamNumber)}
                          disabled={isLoadingAi}
                          className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-teal-400 transition hover:bg-teal-500/10 disabled:opacity-60"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          {isLoadingAi ? "Generating..." : "Generate AI Summary"}
                        </button>
                      )}
                    </div>

                    {/* Pit Scout */}
                    {team.pitScout && (
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                          Pit Scout
                        </p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded-lg bg-white/[0.03] px-4 py-3 text-xs">
                          {team.pitScout.drivetrain && (
                            <span className="text-slate-300">
                              <span className="text-gray-500">Drive: </span>
                              {team.pitScout.drivetrain}
                            </span>
                          )}
                          {team.pitScout.intakeTypes.length > 0 && (
                            <span className="text-slate-300">
                              <span className="text-gray-500">Intake: </span>
                              {team.pitScout.intakeTypes.join(", ")}
                            </span>
                          )}
                          {team.pitScout.scoringRanges.length > 0 && (
                            <span className="text-slate-300">
                              <span className="text-gray-500">Scoring: </span>
                              {team.pitScout.scoringRanges.join(", ")}
                            </span>
                          )}
                          {team.pitScout.climbCapability && (
                            <span className="text-slate-300">
                              <span className="text-gray-500">Climb: </span>
                              {team.pitScout.climbCapability}
                            </span>
                          )}
                          {team.pitScout.autoDescription && (
                            <span className="text-slate-300">
                              <span className="text-gray-500">Auto: </span>
                              {team.pitScout.autoDescription}
                            </span>
                          )}
                          {team.pitScout.notes && (
                            <span className="w-full italic text-slate-400">
                              {team.pitScout.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Match Entries */}
                    {team.entries.length > 0 && (
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                          Match Entries
                        </p>
                        <div className="space-y-1.5">
                          {visibleEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/[0.03] px-4 py-2.5 text-xs"
                            >
                              <span className="w-14 flex-shrink-0 text-gray-500">
                                {entry.matchLabel}
                              </span>
                              <span className="text-slate-300">
                                Auto{" "}
                                <span className="font-semibold text-teal-400">
                                  {entry.autoScore}
                                </span>
                              </span>
                              <span className="text-slate-300">
                                Tele{" "}
                                <span className="font-semibold text-teal-400">
                                  {entry.teleopScore}
                                </span>
                              </span>
                              <span className="text-slate-300">
                                End{" "}
                                <span className="font-semibold text-teal-400">
                                  {entry.endgameScore}
                                </span>
                              </span>
                              <div className="ml-auto flex items-center gap-3">
                                <span className="text-gray-500">
                                  Scouted by {entry.scoutedBy}
                                </span>
                                <Link
                                  href={`/scout/${entry.matchId}/${team.teamNumber}`}
                                  className="font-semibold text-teal-400 transition hover:text-teal-300"
                                >
                                  Review entry
                                </Link>
                              </div>
                            </div>
                          ))}
                          {team.entries.length > 2 && (
                            <button
                              onClick={() => toggleShowMore(team.teamNumber)}
                              className="w-full rounded-lg bg-white/[0.03] py-2 text-center text-xs text-gray-500 transition hover:bg-white/[0.05] hover:text-gray-300"
                            >
                              {showMore
                                ? "Show less"
                                : `+${team.entries.length - 2} more ${
                                    team.entries.length - 2 === 1 ? "entry" : "entries"
                                  }`}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {team.entries.length === 0 && !team.pitScout && (
                      <p className="text-xs text-gray-500">No scouting data yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
