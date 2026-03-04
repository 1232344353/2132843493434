"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PickListLoadingContext = createContext({
  loading: false,
  setLoading: (_: boolean) => {},
});

export function usePickListLoading() {
  return useContext(PickListLoadingContext);
}

export function PickListLoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  return (
    <PickListLoadingContext.Provider value={{ loading, setLoading }}>
      {children}
    </PickListLoadingContext.Provider>
  );
}

const GENERATION_STEPS = [
  "Fetching event data",
  "Loading EPA statistics",
  "Analyzing scouting reports",
  "Evaluating alliance synergies",
  "Building ranked list",
];

// Cumulative ms when each step transition fires
const STEP_TIMINGS = [5000, 12000, 21000, 32000];

function GeneratingSteps() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers = STEP_TIMINGS.map((delay, i) =>
      setTimeout(() => setCurrentStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Progress bar width: interpolate between steps
  const pct = Math.round((currentStep / (GENERATION_STEPS.length - 1)) * 85);

  return (
    <div className="mt-4 space-y-1">
      {/* Progress bar */}
      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-400 shadow-[0_0_12px_-2px_rgba(45,212,191,0.7)]"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>

      {GENERATION_STEPS.map((label, i) => {
        const complete = i < currentStep;
        const active = i === currentStep;
        const pending = i > currentStep;
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: pending ? 0.28 : 1, x: 0 }}
            transition={{ duration: 0.28, delay: i * 0.05 }}
            className="flex items-center gap-2.5 py-0.5"
          >
            {complete ? (
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-400">
                <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1.5 6.5 4.5 9.5 10.5 2.5" />
                </svg>
              </span>
            ) : active ? (
              <span className="relative flex h-5 w-5 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400/35" />
                <span className="relative inline-flex h-5 w-5 rounded-full bg-teal-400/75 ring-2 ring-teal-400/20" />
              </span>
            ) : (
              <span className="h-5 w-5 flex-shrink-0 rounded-full border border-white/12" />
            )}
            <span
              className={`text-sm transition-colors duration-300 ${
                complete
                  ? "text-teal-300/55"
                  : active
                  ? "font-medium text-white"
                  : "text-gray-600"
              }`}
            >
              {label}
            </span>
            {active && (
              <motion.span
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                className="text-xs text-gray-500"
              >
                processing
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function SkeletonTeamRow({ delay }: { delay: number }) {
  return (
    <div className="px-6 py-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start gap-4">
        <div className="h-9 w-9 animate-pulse rounded-full bg-white/8" />
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/6" />
          </div>
          <div className="h-3 w-11/12 animate-pulse rounded bg-white/8" style={{ animationDelay: "80ms" }} />
          <div className="h-3 w-9/12 animate-pulse rounded bg-white/6" style={{ animationDelay: "160ms" }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-14 animate-pulse rounded-full bg-white/8" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-white/6" />
          <div className="h-7 w-10 animate-pulse rounded-md bg-white/8" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-white/5 p-2 text-center">
            <div className="mx-auto h-2 w-8 animate-pulse rounded bg-white/8" />
            <div className="mx-auto mt-1.5 h-4 w-10 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PickListSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]"
    >
      <div className="space-y-6">
        {/* Strategy Summary skeleton */}
        <section className="rounded-2xl dashboard-panel p-6">
          <div className="flex items-start gap-3">
            <span className="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
              <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-teal-400"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </motion.svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                Generating your alliance pick list
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                This typically takes 30–60 seconds depending on scouting data volume.
              </p>
            </div>
          </div>
          <GeneratingSteps />
        </section>

        {/* Ranked Teams skeleton */}
        <section className="rounded-2xl dashboard-table overflow-hidden">
          <div className="border-b border-white/10 bg-white/5 px-6 py-3">
            <div className="h-3.5 w-28 animate-pulse rounded bg-white/10" />
          </div>
          <div className="divide-y divide-white/10">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonTeamRow key={i} delay={i * 60} />
            ))}
          </div>
        </section>
      </div>

      {/* Sidebar skeleton */}
      <aside className="space-y-6">
        <section className="rounded-2xl dashboard-panel p-6">
          <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-5 w-48 animate-pulse rounded bg-white/8" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded bg-white/6" />
          <div className="mt-6 h-32 w-full animate-pulse rounded-xl bg-white/5" />
        </section>
        <section className="rounded-2xl dashboard-panel p-6">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded bg-white/6" />
          <div className="mt-4 h-10 w-44 animate-pulse rounded-lg bg-white/8" />
        </section>
      </aside>
    </motion.div>
  );
}

export function PickListContentArea({ children }: { children: ReactNode }) {
  const { loading } = usePickListLoading();

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <PickListSkeleton key="skeleton" />
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
