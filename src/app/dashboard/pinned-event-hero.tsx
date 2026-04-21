"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import {
  getStateCode,
  getCountryCode,
  getPalette,
  USAMapBackground,
  WorldMapBackground,
  GlobeDecoration,
} from "@/components/event-map-background";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseLocalDate(value: string): Date | null {
  // "YYYY-MM-DD" must be parsed as local midnight, not UTC midnight.
  // new Date("YYYY-MM-DD") treats the string as UTC which shifts the day
  // by one in any timezone behind UTC (all US timezones).
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateShort(value?: string | null) {
  if (!value) return "";
  const date = parseLocalDate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "TBA";
  const date = parseLocalDate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating particles config (pre-computed — no Math.random())
// ─────────────────────────────────────────────────────────────────────────────

const PARTICLES = [
  { id: 0, x: 8,  delay: 0.0, dur: 5.5, size: 1.5 },
  { id: 1, x: 23, delay: 1.4, dur: 7.0, size: 1.0 },
  { id: 2, x: 39, delay: 0.6, dur: 5.0, size: 2.0 },
  { id: 3, x: 53, delay: 2.1, dur: 6.5, size: 1.5 },
  { id: 4, x: 67, delay: 0.9, dur: 4.8, size: 1.0 },
  { id: 5, x: 80, delay: 1.7, dur: 6.2, size: 2.0 },
  { id: 6, x: 92, delay: 0.3, dur: 5.3, size: 1.0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export interface PinnedEventHeroProps {
  event: {
    tba_key: string;
    name: string;
    location: string | null;
    start_date: string | null;
    end_date: string | null;
    year: number | null;
  };
  isAttending: boolean;
  status: "live" | "upcoming" | "past" | null;
}

export function PinnedEventHero({
  event,
  isAttending,
  status,
}: PinnedEventHeroProps) {
  const palette = getPalette(event.location);
  const stateCode = getStateCode(event.location);
  const countryCode = stateCode ? null : getCountryCode(event.location);

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useTransform(mouseY, [0, 1], [3, -3]);
  const rotateY = useTransform(mouseX, [0, 1], [-4, 4]);
  const springRotateX = useSpring(rotateX, { stiffness: 150, damping: 25 });
  const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 25 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function onMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        className="group relative overflow-hidden rounded-2xl border border-white/[0.07]"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          minHeight: 200,
        }}
      >
        {/* Full-card invisible link */}
        <Link
          href={`/dashboard/events/${event.tba_key}`}
          className="absolute inset-0 z-20"
          aria-label={`Go to ${event.year ? `${event.year} ` : ""}${event.name}`}
        />

        {/* Static base gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 70% 110%, ${palette.bg} 0%, transparent 55%),
              radial-gradient(ellipse at 10% -10%, rgba(99,102,241,0.10) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(15,30,50,0.6) 0%, transparent 100%),
              linear-gradient(160deg, #0d1f2d 0%, #0a1018 60%, #060b0f 100%)
            `,
          }}
        />

        {/* Location background: US state map, world country, or globe */}
        {stateCode ? (
          <USAMapBackground
            stateCode={stateCode}
            color={palette.particle}
            className="pointer-events-none absolute right-0 top-1/2 h-auto w-[80%] -translate-y-1/2 transition-opacity duration-700"
            padFactor={1.8}
          />
        ) : countryCode ? (
          <WorldMapBackground
            countryCode={countryCode}
            color={palette.particle}
            className="pointer-events-none absolute right-0 top-1/2 h-auto w-[75%] -translate-y-1/2 transition-opacity duration-700"
            padFactor={1.8}
          />
        ) : (
          <GlobeDecoration
            color={palette.particle}
            className="pointer-events-none absolute right-2 top-1/2 h-72 w-72 -translate-y-1/2"
          />
        )}

        {/* Edge gradients — fade map at right and bottom */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(6,11,15,0.97) 0%, rgba(6,11,15,0.6) 35%, transparent 60%), linear-gradient(to top, rgba(6,11,15,0.6) 0%, transparent 30%), linear-gradient(to bottom, rgba(6,11,15,0.4) 0%, transparent 30%)"
          }}
        />

        {/* Floating orb 1: location-colored, bottom-right */}
        <motion.div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 340,
            height: 340,
            right: -90,
            bottom: -110,
            background: `radial-gradient(circle, ${palette.orb1} 0%, transparent 65%)`,
            filter: "blur(40px)",
          }}
          animate={{
            x: [0, 28, -16, 10, 0],
            y: [0, -24, 14, -8, 0],
            scale: [1, 1.14, 0.93, 1.07, 1],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.3, 0.55, 0.8, 1],
          }}
        />

        {/* Floating orb 2: location-colored, top-left */}
        <motion.div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 260,
            height: 260,
            left: -70,
            top: -70,
            background: `radial-gradient(circle, ${palette.orb2} 0%, transparent 65%)`,
            filter: "blur(32px)",
          }}
          animate={{
            x: [0, -22, 16, -8, 0],
            y: [0, 20, -14, 6, 0],
            scale: [1, 1.09, 0.95, 1.04, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.35, 0.6, 0.8, 1],
            delay: 4,
          }}
        />

        {/* Floating orb 3: sky-blue, center-top */}
        <motion.div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 220,
            height: 220,
            left: "35%",
            top: "-20%",
            background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 65%)",
            filter: "blur(28px)",
          }}
          animate={{
            x: [0, 18, -22, 8, 0],
            y: [0, -12, 22, -6, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 8,
          }}
        />

        {/* Grid overlay — horizontal lines only */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Floating particles */}
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="pointer-events-none absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              bottom: 0,
              backgroundColor: palette.particle,
            }}
            animate={{
              y: [0, -160],
              opacity: [0, 0.55, 0],
              scale: [0.5, 1, 0.3],
            }}
            transition={{
              duration: p.dur,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeOut",
              times: [0, 0.4, 1],
            }}
          />
        ))}

        {/* Shimmer sweep */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.045) 50%, transparent 70%)",
          }}
          initial={{ x: "-100%" }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            repeatDelay: 9,
            ease: "easeInOut",
          }}
        />

        {/* Pulsing glow line at bottom */}
        <motion.div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${palette.glow}, transparent)`,
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Pinned badge — top right */}
        <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/35 px-2.5 py-1 backdrop-blur-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-gray-400"
          >
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Pinned
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end p-7 md:flex-row md:items-end md:justify-between">
          <div>
            {/* Status badges */}
            <div className="mb-3 flex items-center gap-2">
              {status === "live" ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 ring-1 ring-emerald-500/25">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live now
                </span>
              ) : status === "upcoming" ? (
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 ring-1 ring-amber-500/20">
                  Coming up
                </span>
              ) : (
                <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-gray-500 ring-1 ring-white/10">
                  Past event
                </span>
              )}
              {isAttending && (
                <span className="rounded-full bg-teal-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-teal-400 ring-1 ring-teal-500/20">
                  Attending
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white transition-colors group-hover:text-teal-100 md:text-3xl">
              {event.year ? `${event.year} ` : ""}
              {event.name}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {event.location && (
                <span className="flex items-center gap-1.5">
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
                    className="shrink-0"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {event.location}
                </span>
              )}
              {event.start_date && (
                <span className="flex items-center gap-1.5">
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
                    className="shrink-0"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {event.end_date
                    ? `${formatDateShort(event.start_date)} \u2013 ${formatDateShort(event.end_date)}`
                    : formatDate(event.start_date)}
                </span>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-5 flex items-center gap-3 md:mt-0">
            <span className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-950 shadow-lg shadow-teal-400/10 transition group-hover:bg-teal-300">
              Open event
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
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
