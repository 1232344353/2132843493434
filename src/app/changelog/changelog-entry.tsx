"use client";

import { useState } from "react";
import type { ChangeType } from "@/content/changelog";

const BADGE_STYLES: Record<ChangeType, string> = {
  new: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25",
  improved: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25",
  fixed: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25",
};

const BADGE_LABELS: Record<ChangeType, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

interface Props {
  title: string;
  summary: string;
  changes: { type: ChangeType; text: string }[];
  isLatest?: boolean;
  defaultOpen?: boolean;
}

export function ChangelogEntry({
  title,
  summary,
  changes,
  isLatest,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {isLatest && (
              <span className="mb-2 inline-flex items-center rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-300 ring-1 ring-teal-500/25">
                Latest
              </span>
            )}
            <h2 className="text-base font-semibold leading-snug text-white">
              {title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
              {summary}
            </p>
          </div>
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
            className={`mt-1 shrink-0 text-gray-500 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Animated reveal using grid trick */}
      <div
        className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="mt-4 space-y-2.5 pb-1">
            {changes.map((change, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${BADGE_STYLES[change.type]}`}
                >
                  {BADGE_LABELS[change.type]}
                </span>
                <span className="text-sm leading-relaxed text-gray-300">
                  {change.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
