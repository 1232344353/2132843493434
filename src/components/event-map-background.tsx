"use client";

import { useRef, useState, useEffect } from "react";
import USA from "@svg-maps/usa";
import WORLD from "@svg-maps/world";

// ─────────────────────────────────────────────────────────────────────────────
// Location-based color palettes
// ─────────────────────────────────────────────────────────────────────────────

export const LOCATION_PALETTES = [
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

export function getPalette(location: string | null) {
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
// Location detection helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract the 2-letter lowercase state code from a location string. */
export function getStateCode(location: string | null): string | null {
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
export const COUNTRY_ALIASES: Record<string, string> = {
  "uk": "gb",
  "england": "gb",
  "scotland": "gb",
  "wales": "gb",
  "great britain": "gb",
  "united kingdom": "gb",
};

/** Extract a lowercase ISO 3166-1 alpha-2 country code from a location string.
 *  Returns null for US locations (those are handled by getStateCode). */
export function getCountryCode(location: string | null): string | null {
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
// Background: US map — zooms in on the target state via getBBox for all states
// ─────────────────────────────────────────────────────────────────────────────

export function USAMapBackground({
  stateCode,
  color,
  className,
  padFactor = 0.6,
}: {
  stateCode: string;
  color: string;
  className?: string;
  padFactor?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dynViewBox, setDynViewBox] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const path = svgRef.current.querySelector<SVGPathElement>(
      `[data-id="${stateCode}"]`
    );
    if (!path) return;
    const b = path.getBBox();
    const pad = Math.max(b.width, b.height) * padFactor;
    setDynViewBox(
      `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`
    );
  }, [stateCode]);

  return (
    <svg
      ref={svgRef}
      viewBox={dynViewBox ?? USA.viewBox}
      className={
        className ??
        "pointer-events-none absolute right-4 top-1/2 h-auto w-[45%] -translate-y-1/2 transition-opacity duration-700"
      }
      style={{ opacity: dynViewBox ? 1 : 0 }}
      preserveAspectRatio="xMidYMid meet"
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
            stroke={isTarget ? color : "none"}
            strokeWidth={isTarget ? 1.5 : 0}
            opacity={isTarget ? 0.55 : 0.05}
          />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Background: wire-frame globe for non-US / unrecognised locations
// ─────────────────────────────────────────────────────────────────────────────

export function GlobeDecoration({ color, className }: { color: string; className?: string }) {
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
      className={className ?? "pointer-events-none absolute right-2 top-1/2 h-60 w-60 -translate-y-1/2"}
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

export function WorldMapBackground({
  countryCode,
  color,
  className,
  padFactor = 0.6,
}: {
  countryCode: string;
  color: string;
  className?: string;
  padFactor?: number;
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
    const pad = Math.max(b.width, b.height) * padFactor;
    setDynViewBox(
      `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`
    );
  }, [countryCode]);

  return (
    <svg
      ref={svgRef}
      viewBox={dynViewBox ?? WORLD.viewBox}
      className={className ?? "pointer-events-none absolute right-4 top-1/2 h-auto w-[45%] -translate-y-1/2 transition-opacity duration-700"}
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
            stroke={isTarget ? color : "none"}
            strokeWidth={isTarget ? 1.5 : 0}
            opacity={isTarget ? 0.5 : 0.05}
          />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite wrapper: picks the right background for an event card
// ─────────────────────────────────────────────────────────────────────────────

export function EventMapBackground({ location }: { location: string | null }) {
  const stateCode = getStateCode(location);
  const countryCode = stateCode ? null : getCountryCode(location);
  const palette = getPalette(location);

  if (stateCode) return <USAMapBackground stateCode={stateCode} color={palette.particle} />;
  if (countryCode) return <WorldMapBackground countryCode={countryCode} color={palette.particle} />;
  return <GlobeDecoration color={palette.particle} />;
}
