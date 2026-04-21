"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── Scouting-specific cycling phrases ─────────────────────────────────────────
export const SCOUTING_THINKING_PHRASES = [
  "Analyzing match data",
  "Reviewing scouting entries",
  "Evaluating performance trends",
  "Checking pit scout notes",
  "Identifying key patterns",
  "Building team profile",
  "Summarizing the data",
];

const GENERIC_THINKING_PHRASES = [
  "Analyzing data",
  "Thinking strategically",
  "Crunching numbers",
  "Processing information",
  "Building insights",
];

// ── Color map (static strings — required for Tailwind v4 JIT scanning) ────────
const colorMap = {
  teal: {
    avatarBg: "bg-teal-500/20",
    iconColor: "text-teal-300",
    pingBg: "bg-teal-400",
    dotBg: "bg-teal-300",
  },
  blue: {
    avatarBg: "bg-blue-500/20",
    iconColor: "text-blue-300",
    pingBg: "bg-blue-400",
    dotBg: "bg-blue-300",
  },
} as const;

// ── Sparkle icon ───────────────────────────────────────────────────────────────
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

// ── Hook: cycles through phrases at a fixed interval ──────────────────────────
export function useThinkingPhrase(phrases: string[], intervalMs = 2400): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [phrases, intervalMs]);

  return phrases[index] ?? phrases[0];
}

// ── Component ─────────────────────────────────────────────────────────────────
interface AiThinkingIndicatorProps {
  phrases?: string[];
  size?: "sm" | "md";
  colorScheme?: "teal" | "blue";
  className?: string;
}

export function AiThinkingIndicator({
  phrases = GENERIC_THINKING_PHRASES,
  size = "md",
  colorScheme = "teal",
  className,
}: AiThinkingIndicatorProps) {
  const phrase = useThinkingPhrase(phrases);
  const colors = colorMap[colorScheme];

  if (size === "sm") {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-400 ${className ?? ""}`}>
        {/* Pinging dot */}
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colors.pingBg}`} />
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${colors.pingBg}`} />
        </span>

        {/* Rotating phrase */}
        <AnimatePresence mode="wait">
          <motion.span
            key={phrase}
            initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="inline-block"
          >
            {phrase}
          </motion.span>
        </AnimatePresence>

        {/* Bouncing dots */}
        <span className="inline-flex items-center gap-0.5">
          <span className={`h-1 w-1 animate-bounce rounded-full [animation-delay:0ms] ${colors.dotBg}`} />
          <span className={`h-1 w-1 animate-bounce rounded-full [animation-delay:150ms] ${colors.dotBg}`} />
          <span className={`h-1 w-1 animate-bounce rounded-full [animation-delay:300ms] ${colors.dotBg}`} />
        </span>
      </div>
    );
  }

  // size === "md"
  return (
    <div className={`flex items-start gap-2 ${className ?? ""}`}>
      <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.avatarBg}`}>
        <SparkleIcon className={`h-3 w-3 ${colors.iconColor}`} />
      </span>
      <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm text-gray-400">
          {/* Pinging dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colors.pingBg}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${colors.pingBg}`} />
          </span>

          {/* Rotating phrase */}
          <AnimatePresence mode="wait">
            <motion.span
              key={phrase}
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="inline-block"
            >
              {phrase}
            </motion.span>
          </AnimatePresence>

          {/* Bouncing dots */}
          <span className="inline-flex items-center gap-0.5">
            <span className={`h-1 w-1 animate-bounce rounded-full [animation-delay:0ms] ${colors.dotBg}`} />
            <span className={`h-1 w-1 animate-bounce rounded-full [animation-delay:150ms] ${colors.dotBg}`} />
            <span className={`h-1 w-1 animate-bounce rounded-full [animation-delay:300ms] ${colors.dotBg}`} />
          </span>
        </div>
      </div>
    </div>
  );
}
