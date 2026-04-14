"use client";

import { useEffect, useMemo, useState } from "react";

type UsageLimitMeterProps = {
  limit: number;
  remaining: number;
  resetAt: number;
};

function formatResetCountdown(resetAt: number): string {
  const msRemaining = Math.max(0, resetAt - Date.now());
  const totalSeconds = Math.ceil(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(
      2,
      "0"
    )}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${Math.max(0, seconds)}s`;
}

export function UsageLimitMeter({
  limit,
  remaining,
  resetAt,
}: UsageLimitMeterProps) {
  const used = Math.max(0, limit - remaining);
  const usageRatio = limit > 0 ? used / limit : 0;
  const usedPct = useMemo(() => {
    if (limit <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
  }, [limit, used]);
  const shouldShowCountdown = usageRatio >= 0.01;
  const isExhausted = usedPct >= 100;
  const fillWidth = used <= 0 ? "0%" : `${Math.max(usedPct, 4)}%`;
  const fillBackground = isExhausted
    ? "linear-gradient(90deg, #fb7185 0%, #f59e0b 100%)"
    : "linear-gradient(90deg, #22d3ee 0%, #34d399 100%)";
  const remainingPct = Math.max(0, 100 - usedPct);

  const [countdown, setCountdown] = useState("--");

  useEffect(() => {
    if (!shouldShowCountdown) return;

    const updateCountdown = () => {
      setCountdown(formatResetCountdown(resetAt));
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [resetAt, shouldShowCountdown]);

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
            Team AI Usage
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Shared across your team.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold leading-none text-white">{usedPct}%</p>
          <p className="mt-1 text-xs text-gray-400">used this window</p>
        </div>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: fillWidth,
            background: fillBackground,
            boxShadow: isExhausted
              ? "0 0 0 1px rgba(251,113,133,0.35), 0 0 14px rgba(251,113,133,0.4)"
              : "0 0 0 1px rgba(34,211,238,0.3), 0 0 12px rgba(34,211,238,0.28)",
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p
          className={
            isExhausted
              ? "rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-200"
              : "rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-gray-300"
          }
        >
          {isExhausted
            ? `At limit · resets in ${countdown}`
            : shouldShowCountdown
              ? `${remainingPct}% remaining · resets in ${countdown}`
              : `${remainingPct}% remaining`}
        </p>
        <p className="text-gray-500">Usage limits may vary with system load.</p>
      </div>
    </div>
  );
}
