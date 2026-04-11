"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import USA from "@svg-maps/usa";
import WORLD from "@svg-maps/world";

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

/** Extract the 2-letter lowercase state code from a location string. */
function getStateCode(location: string | null): string | null {
  if (!location) return null;

  // Match ", XX" or ", XX," or ", XX " patterns (explicit 2-letter US state code)
  const abbr = location.match(/,\s*([A-Z]{2})(?:[,\s]|$)/);
  const code = abbr ? abbr[1].toLowerCase() : (() => {
    const loc = location.toLowerCase();
    for (const state of USA.locations) {
      if (loc.includes(state.name.toLowerCase())) return state.id;
    }
    return null;
  })();

  // Reject codes that don't correspond to a known US state (e.g. "UK", "ON", "BC").
  if (!code || !USA.locations.some((s) => s.id === code)) return null;

  return code;
}

/** Map common abbreviations/aliases to ISO 3166-1 alpha-2 codes. */
const COUNTRY_ALIASES: Record<string, string> = {
  "uk": "gb",
  "england": "gb",
  "scotland": "gb",
  "wales": "gb",
  "great britain": "gb",
  "united kingdom": "gb",
};

/** Extract a lowercase ISO 3166-1 alpha-2 country code from a location string.
 *  Returns null for US locations (those are handled by getStateCode). */
function getCountryCode(location: string | null): string | null {
  if (!location) return null;
  const loc = location.toLowerCase();

  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    if (loc.includes(alias)) return code;
  }

  for (const country of WORLD.locations) {
    if (loc.includes(country.name.toLowerCase())) return country.id;
  }

  return null;
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
// Location-based color palettes
// ─────────────────────────────────────────────────────────────────────────────

const LOCATION_PALETTES = [
  { orb1: "rgba(52,211,153,0.22)",  orb2: "rgba(99,102,241,0.16)",  bg: "rgba(52,211,153,0.18)",  glow: "rgba(52,211,153,0.55)",  particle: "#34d399" },
  { orb1: "rgba(251,146,60,0.24)",  orb2: "rgba(167,139,250,0.18)", bg: "rgba(251,146,60,0.14)",  glow: "rgba(251,146,60,0.55)",  particle: "#fb923c" },
  { orb1: "rgba(56,189,248,0.26)",  orb2: "rgba(34,197,94,0.18)",   bg: "rgba(56,189,248,0.16)",  glow: "rgba(56,189,248,0.55)",  particle: "#38bdf8" },
  { orb1: "rgba(239,68,68,0.22)",   orb2: "rgba(251,191,36,0.18)",  bg: "rgba(239,68,68,0.14)",   glow: "rgba(239,68,68,0.55)",   particle: "#ef4444" },
  { orb1: "rgba(167,139,250,0.26)", orb2: "rgba(52,211,153,0.18)",  bg: "rgba(167,139,250,0.16)", glow: "rgba(167,139,250,0.55)", particle: "#a78bfa" },
  { orb1: "rgba(34,197,94,0.24)",   orb2: "rgba(56,189,248,0.18)",  bg: "rgba(34,197,94,0.14)",   glow: "rgba(34,197,94,0.55)",   particle: "#22c55e" },
  { orb1: "rgba(251,191,36,0.24)",  orb2: "rgba(20,184,166,0.20)",  bg: "rgba(251,191,36,0.14)",  glow: "rgba(251,191,36,0.55)",  particle: "#fbbf24" },
  { orb1: "rgba(244,63,94,0.22)",   orb2: "rgba(99,102,241,0.18)",  bg: "rgba(244,63,94,0.14)",   glow: "rgba(244,63,94,0.55)",   particle: "#f43f5e" },
] as const;

function hashLocation(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function getPalette(location: string | null) {
  if (!location) return LOCATION_PALETTES[0];
  const loc = location.toLowerCase();
  if (loc.includes("hawaii") || loc.includes(", hi,") || loc.includes("honolulu")) return LOCATION_PALETTES[6];
  if (loc.includes("california") || loc.includes(", ca,") || loc.includes("los angeles") || loc.includes("san francisco") || loc.includes("sacramento")) return LOCATION_PALETTES[1];
  if (loc.includes("washington") || loc.includes("oregon") || loc.includes("seattle") || loc.includes("portland")) return LOCATION_PALETTES[2];
  if (loc.includes("texas") || loc.includes(", tx,")) return LOCATION_PALETTES[3];
  if (loc.includes("florida") || loc.includes("georgia") || loc.includes("north carolina") || loc.includes("south carolina")) return LOCATION_PALETTES[6];
  if (loc.includes("michigan") || loc.includes("ohio") || loc.includes("illinois") || loc.includes("indiana") || loc.includes("wisconsin") || loc.includes("minnesota")) return LOCATION_PALETTES[2];
  if (loc.includes("new york") || loc.includes("massachusetts") || loc.includes("pennsylvania") || loc.includes("new jersey") || loc.includes("connecticut")) return LOCATION_PALETTES[4];
  if (loc.includes("colorado") || loc.includes("utah") || loc.includes("arizona") || loc.includes("new mexico") || loc.includes("nevada")) return LOCATION_PALETTES[1];
  if (loc.includes("canada") || loc.includes("ontario") || loc.includes("british columbia") || loc.includes("alberta") || loc.includes("quebec")) return LOCATION_PALETTES[5];
  return LOCATION_PALETTES[hashLocation(location) % LOCATION_PALETTES.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Background: US map silhouette with highlighted state
// ─────────────────────────────────────────────────────────────────────────────

// Hawaii and Alaska appear as SVG insets in the bottom-left of the standard
// USA map and get cropped when the map is right-anchored. For these states we
// use getBBox() after mount to find their exact coordinate bounding box, then
// update the viewBox to zoom in on just that state.
const INSET_STATES = new Set(["hi", "ak"]);

function USAMapBackground({
  stateCode,
  color,
}: {
  stateCode: string;
  color: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isInset = INSET_STATES.has(stateCode);
  const [dynViewBox, setDynViewBox] = useState<string | null>(null);

  useEffect(() => {
    if (!isInset || !svgRef.current) return;
    const path = svgRef.current.querySelector<SVGPathElement>(
      `[data-id="${stateCode}"]`
    );
    if (!path) return;
    const b = path.getBBox();
    const pad = Math.max(b.width, b.height) * 0.55;
    setDynViewBox(
      `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`
    );
  }, [stateCode, isInset]);

  return (
    <svg
      ref={svgRef}
      viewBox={dynViewBox ?? USA.viewBox}
      className={
        isInset
          ? "pointer-events-none absolute right-4 top-1/2 h-auto w-[38%] -translate-y-1/2 transition-opacity duration-700"
          : "pointer-events-none absolute right-0 top-1/2 h-auto w-[62%] -translate-y-1/2"
      }
      style={isInset ? { opacity: dynViewBox ? 1 : 0 } : undefined}
      preserveAspectRatio={isInset ? "xMidYMid meet" : "xMaxYMid meet"}
      aria-hidden="true"
    >
      {USA.locations.map((loc) => {
        const isTarget = loc.id === stateCode;
        return (
          <path
            key={loc.id}
            data-id={loc.id}
            d={loc.path}
            fill={isTarget ? color : "white"}
            stroke={isTarget ? color : "rgba(255,255,255,0.4)"}
            strokeWidth={isTarget ? 1.5 : 0.5}
            opacity={isTarget ? 0.22 : 0.045}
          />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Background: wire-frame globe for non-US / unrecognised locations
// ─────────────────────────────────────────────────────────────────────────────

function GlobeDecoration({ color }: { color: string }) {
  const R = 90;
  const C = 100;

  // Meridians: vertical ellipses with rx = R * |sin(angle)|
  const meridians = [18, 36, 54, 72, 90, 108, 126, 144, 162].map((deg) => ({
    key: deg,
    rx: R * Math.abs(Math.sin((deg * Math.PI) / 180)),
  }));

  // Parallels: horizontal ellipses at latitudes ±60, ±30, 0
  // ry uses a 0.25 perspective factor so they look 3-D
  const parallels = [-60, -30, 0, 30, 60].map((lat) => ({
    key: lat,
    yOff: R * Math.sin((lat * Math.PI) / 180),
    rx: R * Math.cos((lat * Math.PI) / 180),
    ry: R * Math.cos((lat * Math.PI) / 180) * 0.26,
  }));

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      className="pointer-events-none absolute right-2 top-1/2 h-60 w-60 -translate-y-1/2"
      aria-hidden="true"
    >
      {/* Sphere outline */}
      <circle
        cx={C}
        cy={C}
        r={R}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="0.8"
        fill="rgba(255,255,255,0.02)"
      />

      {/* Meridians */}
      {meridians.map(({ key, rx }) =>
        rx > 3 ? (
          <ellipse
            key={key}
            cx={C}
            cy={C}
            rx={rx}
            ry={R}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.6"
          />
        ) : null
      )}

      {/* Parallels */}
      {parallels.map(({ key, yOff, rx, ry }) =>
        rx > 5 ? (
          <ellipse
            key={key}
            cx={C}
            cy={C - yOff}
            rx={rx}
            ry={ry}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.6"
          />
        ) : null
      )}

      {/* Location dot at center of globe */}
      <circle cx={C} cy={C} r={4.5} fill={color} opacity="0.9" />
      <circle cx={C} cy={C} r={10} fill={color} opacity="0.22" />
      <circle cx={C} cy={C} r={18} fill={color} opacity="0.07" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Background: world map with highlighted country
// ─────────────────────────────────────────────────────────────────────────────

function WorldMapBackground({
  countryCode,
  color,
}: {
  countryCode: string;
  color: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dynViewBox, setDynViewBox] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const path = svgRef.current.querySelector<SVGPathElement>(
      `[data-id="${countryCode}"]`
    );
    if (!path) return;
    const b = path.getBBox();
    const pad = Math.max(b.width, b.height) * 0.6;
    setDynViewBox(
      `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`
    );
  }, [countryCode]);

  return (
    <svg
      ref={svgRef}
      viewBox={dynViewBox ?? WORLD.viewBox}
      className="pointer-events-none absolute right-4 top-1/2 h-auto w-[45%] -translate-y-1/2 transition-opacity duration-700"
      style={{ opacity: dynViewBox ? 1 : 0 }}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {WORLD.locations.map((loc) => {
        const isTarget = loc.id === countryCode;
        return (
          <path
            key={loc.id}
            data-id={loc.id}
            d={loc.path}
            fill={isTarget ? color : "white"}
            stroke={isTarget ? color : "rgba(255,255,255,0.4)"}
            strokeWidth={isTarget ? 1.5 : 0.5}
            opacity={isTarget ? 0.22 : 0.045}
          />
        );
      })}
    </svg>
  );
}

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
          <USAMapBackground stateCode={stateCode} color={palette.particle} />
        ) : countryCode ? (
          <WorldMapBackground countryCode={countryCode} color={palette.particle} />
        ) : (
          <GlobeDecoration color={palette.particle} />
        )}

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

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
            `,
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
            <line x1="12" x2="12" y1="17" y2="22" />
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
