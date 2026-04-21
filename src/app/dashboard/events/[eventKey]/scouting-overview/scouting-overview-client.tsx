"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/components/i18n-provider";
import type { TranslationKey } from "@/lib/i18n/en";
import {
  formatRateLimitUsageMessage,
  readRateLimitSnapshot,
  resolveRateLimitMessage,
} from "@/lib/rate-limit-ui";
import {
  Search,
  X,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

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
  defenseRating: number;
  reliabilityRating: number;
  notes: string | null;
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

const FILTER_OPTIONS: {
  value: "all" | "pit_scouted" | "low_coverage";
  labelKey: TranslationKey;
}[] = [
  { value: "all", labelKey: "overview.filterAll" },
  { value: "pit_scouted", labelKey: "overview.filterPitScouted" },
  { value: "low_coverage", labelKey: "overview.filterLowCoverage" },
];

type Props = {
  eventId: string;
  eventKey: string;
  teamData: TeamScoutData[];
  totalEntries: number;
  pitScoutedCount: number;
};

function WordFade({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((part, i) =>
        part.trim() ? (
          <span key={i} className="word-fade-in">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function MarkdownSummary({ text, size = "sm" }: { text: string; size?: "xs" | "sm" }) {
  const base = size === "xs" ? "text-xs" : "text-sm";
  return (
    <Markdown
      components={{
        p: ({ children }) => <p className={`${base} leading-relaxed text-slate-300 mb-2 last:mb-0`}>{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        h3: ({ children }) => <h3 className="text-xs font-bold uppercase tracking-widest text-teal-400 mt-3 mb-1 first:mt-0">{children}</h3>,
        h4: ({ children }) => <h4 className="text-xs font-semibold text-gray-300 mt-2 mb-0.5">{children}</h4>,
        ul: ({ children }) => <ul className="my-1.5 space-y-0.5 pl-3">{children}</ul>,
        li: ({ children }) => (
          <li className={`${base} leading-relaxed text-slate-300 flex gap-1.5`}>
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-500/60" />
            <span>{children}</span>
          </li>
        ),
      }}
    >
      {text}
    </Markdown>
  );
}

export function ScoutingOverviewClient({
  eventId,
  eventKey,
  teamData,
  totalEntries,
  pitScoutedCount,
}: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [aiSummaries, setAiSummaries] = useState<Map<number | "event", string>>(new Map());
  const [loadingAi, setLoadingAi] = useState<Set<number | "event">>(new Set());
  const [aiErrors, setAiErrors] = useState<Map<number | "event", string>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "pit_scouted" | "low_coverage">("all");
  const [showMoreMap, setShowMoreMap] = useState<Map<number, boolean>>(new Map());
  const [showEventSummaryModal, setShowEventSummaryModal] = useState(false);
  const [streamingText, setStreamingText] = useState<Map<number | "event", string>>(new Map());
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    setIsFiltering(true);
    const id = setTimeout(() => setIsFiltering(false), 180);
    return () => clearTimeout(id);
  }, [searchQuery, filterMode]);

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
    setAiErrors((prev) => { const m = new Map(prev); m.delete(key); return m; });
    setAiSummaries((prev) => { const m = new Map(prev); m.delete(key); return m; });
    setStreamingText((prev) => { const m = new Map(prev); m.delete(key); return m; });

    let accumulated = "";

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

      const usageSnapshot = readRateLimitSnapshot(res.headers);

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(resolveRateLimitMessage(res.status, data?.error ?? `Request failed (${res.status})`));
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedFirstToken = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as { token?: string };
            if (typeof parsed.token === "string" && parsed.token.length > 0) {
              accumulated += parsed.token;
              if (!receivedFirstToken) {
                receivedFirstToken = true;
                setLoadingAi((prev) => { const s = new Set(prev); s.delete(key); return s; });
              }
              setStreamingText((prev) => new Map(prev).set(key, accumulated));
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      if (accumulated) {
        setAiSummaries((prev) => new Map(prev).set(key, accumulated));
      }
      if (usageSnapshot) {
        toast(formatRateLimitUsageMessage(usageSnapshot, "ai"), "info");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate summary";
      setAiErrors((prev) => new Map(prev).set(key, msg));
    } finally {
      setLoadingAi((prev) => { const s = new Set(prev); s.delete(key); return s; });
      setStreamingText((prev) => { const m = new Map(prev); m.delete(key); return m; });
    }
  }

  const teamsWithFewEntries = teamData.filter((t) => t.entries.length < 2).length;
  const isEventLoading = loadingAi.has("event");

  return (
    <div className="space-y-4">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-400">
            {t("overview.scoutingReports")}
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-white">{t("event.scoutReports")}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {totalEntries} {totalEntries === 1 ? "entry" : "entries"} across {teamData.length} {teamData.length === 1 ? "team" : "teams"}{pitScoutedCount > 0 ? `, ${pitScoutedCount} pit ${pitScoutedCount === 1 ? "scout" : "scouts"}` : ""}
          </p>
        </div>

        <button
          data-tour="overview-ai"
          onClick={() => setShowEventSummaryModal(true)}
          disabled={isEventLoading || streamingText.has("event")}
          className="dashboard-action dashboard-action-holo shrink-0 disabled:opacity-60"
        >
          {isEventLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white/90" />
              {t("common.preparing")}
            </span>
          ) : (
            t("overview.generateSummary")
          )}
        </button>
      </div>

      {/* AI event summary result */}
      <AnimatePresence>
        {(aiSummaries.has("event") || aiErrors.has("event") || isEventLoading || streamingText.has("event")) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-xl border border-teal-500/20 bg-teal-500/[0.05]"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
            <div className="p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-teal-400">
                {t("overview.aiEventSummary")}
              </p>
              {aiErrors.has("event") ? (
                <p className="text-xs text-red-400">{aiErrors.get("event")}</p>
              ) : isEventLoading && !streamingText.has("event") ? (
                <div className="space-y-1.5">
                  <div className="skeleton-shimmer h-3 w-full rounded" />
                  <div className="skeleton-shimmer h-3 w-4/5 rounded" />
                  <div className="skeleton-shimmer h-3 w-3/5 rounded" />
                </div>
              ) : (
                <MarkdownSummary text={streamingText.get("event") ?? aiSummaries.get("event") ?? ""} size="sm" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Low coverage alert */}
      <AnimatePresence>
        {teamsWithFewEntries > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] px-4 py-3"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={2} />
            <p className="text-xs text-gray-400">
              {t("overview.lowCoverage", { count: teamsWithFewEntries, teams: teamsWithFewEntries === 1 ? "team" : "teams" })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search + filter toolbar ── */}
      <div data-tour="overview-filters" className="flex items-center overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex flex-1 items-center gap-2.5 px-3.5 py-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-gray-600" strokeWidth={2} />
          <input
            type="text"
            placeholder={t("overview.searchTeams")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-300 placeholder:text-gray-600 outline-none"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12 }}
                onClick={() => setSearchQuery("")}
                className="text-gray-600 transition hover:text-gray-400"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="h-7 w-px bg-white/[0.06]" />
        <div className="flex items-center gap-0.5 p-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterMode(opt.value)}
              className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterMode === opt.value ? "text-teal-300" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {filterMode === opt.value && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 rounded-lg bg-teal-500/15 ring-1 ring-teal-500/25"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">{t(opt.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Team list ── */}
      <div data-tour="overview-teams">
      {isFiltering ? (
        <div className="space-y-3">
          {Array.from({ length: Math.min(filteredTeams.length || 5, 8) }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-14"
        >
          <Search className="mb-3 h-7 w-7 text-gray-700" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-500">{t("overview.noTeamsMatch")}</p>
          <button
            onClick={() => { setSearchQuery(""); setFilterMode("all"); }}
            className="mt-2 text-xs text-teal-500 transition hover:text-teal-300"
          >
            {t("overview.clearFilters")}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredTeams.map((team) => {
            const isLowCoverage = team.entries.length < 2;
            const teamAiKey = team.teamNumber;
            const hasAiSummary = aiSummaries.has(teamAiKey);
            const isLoadingAi = loadingAi.has(teamAiKey);
            const aiError = aiErrors.get(teamAiKey);
            const showMore = showMoreMap.get(team.teamNumber) ?? false;
            const visibleEntries = showMore ? team.entries : team.entries.slice(0, 3);

            const pitChips = team.pitScout ? [
              team.pitScout.drivetrain && `Drive: ${team.pitScout.drivetrain}`,
              team.pitScout.intakeTypes.length > 0 && `Intake: ${team.pitScout.intakeTypes.join(", ")}`,
              team.pitScout.scoringRanges.length > 0 && `Scoring: ${team.pitScout.scoringRanges.join(", ")}`,
              team.pitScout.climbCapability && `Climb: ${team.pitScout.climbCapability}`,
            ].filter(Boolean) as string[] : [];

            const isExpanded = expandedTeams.has(team.teamNumber);

            return (
              <div key={team.teamNumber} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                {/* ── Team header ── */}
                <div className="flex items-center border-b border-white/[0.05]">
                  <button
                    onClick={() => toggleExpand(team.teamNumber)}
                    className="flex flex-1 items-center gap-2 px-5 py-3.5 text-left"
                  >
                    <span className="text-sm font-bold text-white">{team.teamNumber}</span>
                    <span className="text-xs text-gray-500 truncate">{team.teamName}</span>
                    {team.pitScout && (
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                        {t("reports.pitScout")}
                      </span>
                    )}
                    {isLowCoverage && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                        {t("overview.filterLowCoverage")}
                      </span>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5 pr-4">
                    <button
                      onClick={() => void fetchAiSummary("team", team.teamNumber)}
                      disabled={isLoadingAi || streamingText.has(teamAiKey)}
                      className="rounded-lg border border-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-teal-400 transition hover:border-teal-500/25 hover:bg-teal-500/10 disabled:opacity-50"
                    >
                      {isLoadingAi ? t("common.preparing") : hasAiSummary || streamingText.has(teamAiKey) ? t("overview.aiSummaryLabel") : t("overview.generateAiSummary")}
                    </button>
                    <button
                      onClick={() => toggleExpand(team.teamNumber)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition hover:bg-white/5 hover:text-gray-300"
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                </div>

                {/* ── AI summary (inline, no expand needed) ── */}
                <AnimatePresence>
                  {(hasAiSummary || streamingText.has(teamAiKey) || aiError) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-b border-white/[0.05] px-5 py-3">
                        {aiError ? (
                          <p className="text-xs text-red-400">{aiError}</p>
                        ) : (
                          <div className="overflow-hidden rounded-lg border border-teal-500/15 bg-teal-500/[0.05]">
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" />
                            <div className="p-3">
                              <MarkdownSummary text={streamingText.get(teamAiKey) ?? aiSummaries.get(teamAiKey) ?? ""} size="xs" />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Expandable body ── */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      {/* ── Match entry cards ── */}
                      <div className="px-5 py-3 space-y-2">
                        {team.entries.length === 0 ? (
                          <div className="flex items-center justify-between py-2">
                            <p className="text-xs text-gray-600">{t("overview.noMatchEntries")}</p>
                            <Link
                              href={`/dashboard/events/${eventKey}/matches`}
                              className="whitespace-nowrap text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                            >
                              {t("overview.scoutMatch")}
                            </Link>
                          </div>
                        ) : (
                          <>
                            {visibleEntries.map((entry) => {
                              const starDisplay = (r: number) =>
                                "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
                              return (
                                <div key={entry.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-white">{entry.matchLabel}</p>
                                      <p className="text-xs text-gray-500">{entry.scoutedBy}</p>
                                    </div>
                                    <Link
                                      href={`/scout/${entry.matchId}/${team.teamNumber}`}
                                      className="shrink-0 text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                                    >
                                      {t("reports.reviewEntry")}
                                    </Link>
                                  </div>
                                  <div className="mt-3 grid grid-cols-5 gap-1.5 text-xs">
                                    {[
                                      { label: "Auto", value: String(entry.autoScore) },
                                      { label: "Tele", value: String(entry.teleopScore) },
                                      { label: "End", value: String(entry.endgameScore) },
                                      { label: "Def", value: starDisplay(entry.defenseRating), yellow: true },
                                      { label: "Rel", value: starDisplay(entry.reliabilityRating), yellow: true },
                                    ].map(({ label, value, yellow }) => (
                                      <div key={label} className="rounded-lg bg-black/20 p-2 text-center">
                                        <p className="text-[10px] text-gray-500">{label}</p>
                                        <p className={`font-semibold ${yellow ? "text-yellow-400" : "text-white"}`}>{value}</p>
                                      </div>
                                    ))}
                                  </div>
                                  {entry.notes && (
                                    <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-xs text-gray-300">{entry.notes}</p>
                                  )}
                                </div>
                              );
                            })}
                            {team.entries.length > 3 && (
                              <button
                                onClick={() => toggleShowMore(team.teamNumber)}
                                className="w-full py-2 text-center text-xs text-gray-600 transition hover:text-gray-400"
                              >
                                {showMore ? t("overview.showLess") : t("overview.showMore", { count: team.entries.length - 3 })}
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* ── Pit entry card ── */}
                      {team.pitScout ? (
                        <div className="px-5 pb-4">
                          <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-4">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">{team.teamNumber}</p>
                                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">{t("reports.pitScout")}</span>
                              </div>
                              <Link
                                href={`/dashboard/events/${eventKey}/teams/${team.teamNumber}`}
                                className="shrink-0 text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                              >
                                {t("common.review")}
                              </Link>
                            </div>
                            {pitChips.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {pitChips.map((chip) => (
                                  <span key={chip} className="rounded-md bg-black/20 px-2.5 py-1 text-[11px] text-slate-300">{chip}</span>
                                ))}
                              </div>
                            )}
                            {team.pitScout.autoDescription && (
                              <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-xs text-gray-300">
                                <span className="text-gray-500">Auto: </span>{team.pitScout.autoDescription}
                              </p>
                            )}
                            {team.pitScout.notes && (
                              <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-xs text-gray-300">{team.pitScout.notes}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-5 pb-4 pt-1">
                          <p className="text-xs text-gray-600">{t("overview.noPitScout")}</p>
                          <Link
                            href={`/dashboard/events/${eventKey}/teams/${team.teamNumber}`}
                            className="text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                          >
                            {t("overview.scoutPit")}
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* ── Event summary modal ── */}
      <AnimatePresence>
        {showEventSummaryModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setShowEventSummaryModal(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a1020]/95 shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: "spring", stiffness: 300, damping: 28 },
              }}
              exit={{
                opacity: 0,
                y: 12,
                scale: 0.98,
                transition: { duration: 0.15 },
              }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />

              <div className="p-6">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-400">
                  {t("overview.aiSummaryLabel")}
                </p>
                <h2 className="mt-2 text-lg font-bold text-white">{t("overview.generateSummary")}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {t("overview.modalDesc")}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    t("overview.analyzePoint1"),
                    t("overview.analyzePoint2"),
                    t("overview.analyzePoint3"),
                    t("overview.analyzePoint4"),
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-slate-500">
                      <span className="mt-0.5 text-teal-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] text-gray-600">
                  {t("overview.usageNote")}
                </p>
              </div>

              <div className="flex gap-2.5 border-t border-white/[0.06] p-4">
                <button
                  onClick={() => setShowEventSummaryModal(false)}
                  className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-white/[0.04]"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => {
                    setShowEventSummaryModal(false);
                    void fetchAiSummary("event");
                  }}
                  className="dashboard-action dashboard-action-holo flex-1"
                >
                  {t("overview.generate")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
