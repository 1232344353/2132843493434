"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import {
  formatRateLimitUsageMessage,
  readRateLimitSnapshot,
  resolveRateLimitMessage,
} from "@/lib/rate-limit-ui";

type SyncJobPhase =
  | "queued"
  | "retrying"
  | "syncing_event"
  | "syncing_stats"
  | "done"
  | "failed"
  | "dead";

type SyncJobStatus = {
  id: string;
  phase: SyncJobPhase;
  progress: number;
  statusMessage: string;
  warning: string | null;
  error: string | null;
  result: {
    synced: number;
    total: number;
  } | null;
};

export function SyncStatsButton({
  eventKey,
  compact = false,
}: {
  eventKey: string;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId || !loading) return;

    const pollJobStatus = async () => {
      const res = await fetch(`/api/events/sync/jobs/${jobId}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; job?: SyncJobStatus }
        | null;

      if (!res.ok || !data?.job) {
        throw new Error(data?.error ?? "Failed to read sync job status.");
      }

      const job = data.job;
      setProgress(Math.max(0, Math.min(100, job.progress ?? 0)));
      setStatus(job.statusMessage ?? null);

      if (job.phase === "done") {
        setLoading(false);
        setJobId(null);
        const synced = job.result?.synced ?? 0;
        const total = job.result?.total ?? 0;
        const msg = `Synced EPA for ${synced}/${total} teams.`;
        setStatus(msg);
        if (compact) {
          toast(msg, "success");
          setStatus(null);
        }
        return;
      }

      if (job.phase === "failed" || job.phase === "dead") {
        throw new Error(job.error ?? "Sync failed.");
      }
    };

    void pollJobStatus().catch((pollError) => {
      const msg = pollError instanceof Error ? pollError.message : "Sync failed";
      setError(msg);
      setLoading(false);
      setJobId(null);
      setStatus(null);
      if (compact) {
        toast(msg, "error");
        setError(null);
      }
    });

    pollRef.current = setInterval(() => {
      void pollJobStatus().catch((pollError) => {
        const msg = pollError instanceof Error ? pollError.message : "Sync failed";
        setError(msg);
        setLoading(false);
        setJobId(null);
        setStatus(null);
        if (compact) {
          toast(msg, "error");
          setError(null);
        }
      });
    }, 1500);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobId, loading, compact, toast]);

  async function handleSync() {
    setLoading(true);
    setError(null);
    setProgress(4);
    setStatus("Queueing EPA sync...");

    try {
      const res = await fetch("/api/events/sync/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventKey, mode: "stats" }),
      });
      const usage = readRateLimitSnapshot(res.headers);
      if (usage) {
        toast(formatRateLimitUsageMessage(usage, "sync"), "info");
      }
      const data = (await res.json().catch(() => null)) as
        | { error?: string; job?: SyncJobStatus }
        | null;

      if (!res.ok || !data?.job) {
        throw new Error(
          resolveRateLimitMessage(
            res.status,
            data?.error || "Failed to queue stats sync",
            "sync"
          )
        );
      }

      setJobId(data.job.id);
      setProgress(Math.max(4, Math.min(100, data.job.progress ?? 4)));
      setStatus(data.job.statusMessage || "Sync job started...");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setError(msg);
      setStatus(null);
      setLoading(false);
      setJobId(null);
      setProgress(0);
      if (compact) {
        toast(msg, "error");
        setError(null);
      }
    }
  }

  /* ── Compact (nav-strip) variant ── */
  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        title={loading ? (status ?? "Syncing EPA...") : "Sync EPA stats"}
        className={`relative flex items-center gap-1.5 overflow-hidden rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          loading
            ? "cursor-default text-teal-400 bg-teal-500/10"
            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`}
      >
        {/* Progress bar along the bottom of the button */}
        {loading && (
          <span
            className="pointer-events-none absolute bottom-0 left-0 h-[2px] rounded-full bg-teal-400/60 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        )}

        {/* Icon */}
        {loading ? (
          <svg
            className="animate-spin shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        )}

        <span>{loading ? "Syncing..." : "Sync EPA"}</span>
      </button>
    );
  }

  /* ── Full (standalone) variant ── */
  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-gray-200 shadow-sm transition hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-300 disabled:opacity-50"
      >
        {loading ? (
          <svg
            className="animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        )}
        {loading ? "Syncing..." : "Sync stats"}
      </button>

      {(loading || progress > 0) && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {status && <p className="text-xs text-emerald-400">{status}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
