"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface TeamStat {
  team_number: number;
  name: string;
  city: string;
  state: string;
  epa: number | null;
  auto_epa: number | null;
  teleop_epa: number | null;
  endgame_epa: number | null;
  win_rate: number | null;
}

type SortKey = keyof TeamStat;
const ROWS_PER_PAGE = 24;

function SortHeader({
  label,
  field,
  sortKey,
  sortAsc,
  onSort,
}: {
  label: string;
  field: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortKey === field;
  return (
    <th
      onClick={() => onSort(field)}
      className="cursor-pointer select-none px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-500 transition hover:text-gray-300"
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={`transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`}>
          {isActive && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${sortAsc ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </span>
      </span>
    </th>
  );
}

const RANK_MEDALS: Record<number, { label: string; class: string }> = {
  1: { label: "1", class: "text-amber-400 font-bold" },
  2: { label: "2", class: "text-gray-300 font-bold" },
  3: { label: "3", class: "text-amber-700 font-bold" },
};

function WinRatePill({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-gray-600">—</span>;
  const pct = Math.round(rate * 100);
  const colorClass =
    pct >= 70
      ? "text-emerald-400"
      : pct >= 50
      ? "text-teal-400"
      : pct >= 30
      ? "text-gray-400"
      : "text-red-400/70";
  return <span className={`tabular-nums font-medium ${colorClass}`}>{pct}%</span>;
}

function EpaBar({
  value,
  max,
}: {
  value: number | null;
  max: number;
}) {
  if (value === null || max === 0) return <span className="text-gray-600">—</span>;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <span className="flex items-center gap-2">
      <span className="font-medium tabular-nums text-white">{value.toFixed(1)}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.07]">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-300"
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

export function TeamStatsTable({
  data,
  eventKey,
  highlightTeam = null,
}: {
  data: TeamStat[];
  eventKey: string;
  highlightTeam?: number | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("epa");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageDirection, setPageDirection] = useState<1 | -1>(1);
  const prefersReducedMotion = useReducedMotion();

  const missingEpaCount = useMemo(
    () => data.filter((team) => team.epa === null).length,
    [data]
  );
  const showEpaNotice = missingEpaCount > 0;

  const maxEpa = useMemo(
    () => Math.max(...data.map((t) => t.epa ?? 0), 1),
    [data]
  );

  const sorted = useMemo(() => {
    const filtered = data.filter(
      (t) =>
        t.team_number.toString().includes(search) ||
        t.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null && bVal === null) return a.team_number - b.team_number;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortKey, sortAsc, search]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = useMemo(
    () => sorted.slice(pageStart, pageStart + ROWS_PER_PAGE),
    [sorted, pageStart]
  );

  function handleSort(key: SortKey) {
    setPageDirection(-1);
    setPage(1);
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  return (
    <div className="space-y-4">
      {showEpaNotice && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5 text-xs text-amber-300/80">
          {missingEpaCount === data.length
            ? "EPA stats will appear once matches start or as the event gets closer."
            : `EPA stats are still syncing for ${missingEpaCount} team${missingEpaCount === 1 ? "" : "s"}.`}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
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
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by team number or name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPageDirection(-1); setPage(1); }}
          className="w-full rounded-lg py-2 pl-9 pr-3 text-sm text-white shadow-sm dashboard-input"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
        <div className="-mx-0 overflow-x-auto">
          <table className="min-w-[680px] w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.025]">
                <th className="w-12 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  #
                </th>
                <SortHeader label="Team" field="team_number" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortHeader label="Name" field="name" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortHeader label="EPA" field="epa" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortHeader label="Auto" field="auto_epa" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortHeader label="Teleop" field="teleop_epa" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortHeader label="Endgame" field="endgame_epa" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortHeader label="Win Rate" field="win_rate" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
              </tr>
            </thead>
            <AnimatePresence mode="wait" initial={false}>
              <motion.tbody
                key={`team-stats-page-${safePage}`}
                className="divide-y divide-white/[0.05]"
                custom={pageDirection}
                initial={prefersReducedMotion ? false : { opacity: 0, x: pageDirection > 0 ? 16 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, x: pageDirection > 0 ? -16 : 16 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                {pageRows.map((team, i) => {
                  const rank = pageStart + i + 1;
                  const isHighlighted = highlightTeam !== null && team.team_number === highlightTeam;
                  const medalStyle = RANK_MEDALS[rank];

                  return (
                    <tr
                      key={team.team_number}
                      className={`transition-colors ${
                        isHighlighted
                          ? "bg-teal-500/[0.1] ring-1 ring-inset ring-teal-500/20 hover:bg-teal-500/[0.14]"
                          : "hover:bg-white/[0.025]"
                      }`}
                    >
                      {/* Rank */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className={medalStyle ? medalStyle.class : "text-gray-600 tabular-nums"}>
                          {rank}
                        </span>
                      </td>

                      {/* Team number */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                        <Link
                          href={`/dashboard/events/${eventKey}/teams/${team.team_number}`}
                          className={`transition hover:underline ${isHighlighted ? "font-bold text-teal-300 hover:text-teal-200" : "text-teal-400 hover:text-teal-300"}`}
                        >
                          {team.team_number}
                        </Link>
                      </td>

                      {/* Name */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-300">
                        {team.name}
                      </td>

                      {/* EPA with bar */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <EpaBar value={team.epa} max={maxEpa} />
                      </td>

                      {/* Sub-scores */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-400">
                        {team.auto_epa !== null ? team.auto_epa.toFixed(1) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-400">
                        {team.teleop_epa !== null ? team.teleop_epa.toFixed(1) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-400">
                        {team.endgame_epa !== null ? team.endgame_epa.toFixed(1) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Win rate */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <WinRatePill rate={team.win_rate} />
                      </td>
                    </tr>
                  );
                })}
              </motion.tbody>
            </AnimatePresence>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <p>
          {sorted.length} team{sorted.length !== 1 ? "s" : ""}
          {sorted.length > 0 && (
            <> &middot; {pageStart + 1}&ndash;{Math.min(pageStart + ROWS_PER_PAGE, sorted.length)}</>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setPageDirection(-1); setPage((p) => Math.max(1, Math.min(p, totalPages) - 1)); }}
              disabled={safePage === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="tabular-nums">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => { setPageDirection(1); setPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1)); }}
              disabled={safePage === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
