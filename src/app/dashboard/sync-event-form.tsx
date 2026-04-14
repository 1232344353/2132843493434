"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  eventKey: string;
  phase: SyncJobPhase;
  progress: number;
  warning: string | null;
  statusMessage: string;
  error: string | null;
  result: {
    synced: number;
    total: number;
  } | null;
};

export function SyncEventForm() {
  const { toast } = useToast();
  const [eventKey, setEventKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "event" | "stats" | "done">("idle");
  const [slow, setSlow] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [activeEventKey, setActiveEventKey] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

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
      if (job.warning) {
        setWarning(job.warning);
      }

      if (
        job.phase === "syncing_event" ||
        job.phase === "queued" ||
        job.phase === "retrying"
      ) {
        setPhase("event");
        return;
      }
      if (job.phase === "syncing_stats") {
        setPhase("stats");
        return;
      }
      if (job.phase === "done") {
        setPhase("done");
        setLoading(false);
        setJobId(null);

        const routeEventKey = (activeEventKey ?? eventKey).trim().toLowerCase();
        setTimeout(() => {
          router.push(`/dashboard/events/${routeEventKey}`);
        }, 1200);
        return;
      }
      if (job.phase === "failed" || job.phase === "dead") {
        throw new Error(job.error ?? "Sync failed.");
      }
    };

    void pollJobStatus().catch((pollError) => {
      setError(pollError instanceof Error ? pollError.message : "Sync failed");
      setLoading(false);
      setJobId(null);
      setStatus(null);
      setPhase("idle");
    });

    pollRef.current = setInterval(() => {
      void pollJobStatus().catch((pollError) => {
        setError(pollError instanceof Error ? pollError.message : "Sync failed");
        setLoading(false);
        setJobId(null);
        setStatus(null);
        setPhase("idle");
      });
    }, 1500);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeEventKey, eventKey, jobId, loading, router]);

  useEffect(() => {
    if (!loading) return;
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, [loading, phase]);

  async function handleSync() {
    if (!eventKey.trim()) return;

    const normalizedEventKey = eventKey.trim().toLowerCase();
    setLoading(true);
    setError(null);
    setStatus("Queueing sync job...");
    setWarning(null);
    setProgress(4);
    setPhase("event");
    setActiveEventKey(normalizedEventKey);

    try {
      const queueRes = await fetch("/api/events/sync/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventKey: normalizedEventKey }),
      });

      const queueUsage = readRateLimitSnapshot(queueRes.headers);
      if (queueUsage) {
        toast(formatRateLimitUsageMessage(queueUsage, "sync"), "info");
      }

      const queueData = (await queueRes.json().catch(() => null)) as
        | { error?: string; job?: SyncJobStatus }
        | null;

      if (!queueRes.ok || !queueData?.job) {
        throw new Error(
          resolveRateLimitMessage(
            queueRes.status,
            queueData?.error ?? "Failed to queue sync job",
            "sync"
          )
        );
      }

      setJobId(queueData.job.id);
      setProgress(Math.max(4, Math.min(100, queueData.job.progress ?? 4)));
      setStatus(queueData.job.statusMessage || "Sync job started...");
      if (queueData.job.warning) {
        setWarning(queueData.job.warning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setStatus(null);
      setLoading(false);
      setJobId(null);
      setPhase("idle");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex gap-2">
          <input
            type="text"
            value={eventKey}
            onChange={(e) => setEventKey(e.target.value)}
            placeholder="TBA event key (e.g. 2025hiho)"
            className="flex-1 rounded-lg px-3 py-2 text-sm text-white shadow-sm placeholder:text-gray-500 dashboard-input"
            disabled={loading}
          />
          <button
            onClick={handleSync}
            disabled={loading || !eventKey.trim()}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-400 disabled:opacity-50"
          >
            {loading ? "Syncing..." : "Sync Event"}
          </button>
        </div>
        {!loading && (
          <p className="mt-2 text-[11px] text-gray-600">
            Find the key after <span className="font-mono">/event/</span> in the{" "}
            <a href="https://www.thebluealliance.com/events" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500">
              TBA URL
            </a>
            , e.g. <span className="font-mono">2025hiho</span>
          </p>
        )}
      </div>
      {(loading || progress > 0) && (
        <div className="space-y-3">
          {/* Gradient progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-300 shadow-[0_0_10px_-2px_rgba(45,212,191,0.55)]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Phase step indicators */}
          {loading && (() => {
            const stepIndex = phase === "event" ? 0 : phase === "stats" ? 1 : 2;
            const steps = [
              { label: "Event data" },
              { label: "EPA stats" },
            ];
            return (
              <div className="flex items-center gap-4">
                {steps.map(({ label }, i) => {
                  const complete = stepIndex > i;
                  const active = stepIndex === i;
                  return (
                    <div key={label} className="flex items-center gap-1.5">
                      {complete ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-500/20 text-teal-400">
                          <svg viewBox="0 0 12 12" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1.5 6.5 4.5 9.5 10.5 2.5" />
                          </svg>
                        </span>
                      ) : active ? (
                        <span className="relative flex h-4 w-4">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400/35" />
                          <span className="relative inline-flex h-4 w-4 rounded-full bg-teal-400/70" />
                        </span>
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-white/15" />
                      )}
                      <span className={`text-xs ${active ? "font-medium text-white" : complete ? "text-teal-300/55" : "text-gray-600"}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {status && (
            <p className="text-xs text-gray-400">{status}</p>
          )}
          {slow && loading && (
            <p className="rounded-md bg-white/5 px-2.5 py-1.5 text-xs text-gray-400">
              This is taking a while, please keep this tab open.
            </p>
          )}
        </div>
      )}
      {warning && (
        <p className="rounded-lg bg-teal-500/10 px-3 py-2 text-sm text-teal-200">
          {warning}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
