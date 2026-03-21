export function buildFrcGamePrompt(year: number | null | undefined): string {
  if (year === 2026) {
    return `Season context (FRC 2026: REBUILT, official manual-aligned summary):
- Core objective: score FUEL in your HUB, manage active/inactive HUB windows during TELEOP, and earn endgame points through TOWER climbing and/or END GAME FUEL scoring.
- MATCH flow: AUTO (20s), then TELEOP (2:20) with TRANSITION SHIFT (10s), SHIFT 1-4 (25s each), then END GAME (30s).
- HUB logic: both HUBS are active in AUTO, TRANSITION SHIFT, and END GAME. During SHIFT 1-4, one HUB is active and the other inactive (driven by AUTO FUEL result).
- 2026 scoring highlights: active HUB FUEL = 1 point (AUTO and TELEOP), inactive HUB FUEL = 0 points. TOWER points: LEVEL 1 = 15 (AUTO) / 10 (TELEOP), LEVEL 2 = 20 (TELEOP), LEVEL 3 = 30 (TELEOP).
- END GAME scoring: during the 30-second END GAME window, robots can score FUEL (both HUBS are active) AND/OR attempt TOWER climbs. Endgame EPA reflects BOTH FUEL scored during the END GAME period and TOWER climb points. Many teams focus on FUEL scoring during END GAME rather than climbing. Do not assume endgame EPA comes solely from climbing.
- 2026 RP framework: ENERGIZED RP (100 active HUB FUEL at Regional/District events; 140 at District Championship/Championship), SUPERCHARGED RP (360 active HUB FUEL at Regional/District events; 510 at District Championship/Championship), TRAVERSAL RP (50 TOWER points at Regional/District events; 70 at District Championship/Championship).

Terminology rules:
- Use official 2026 terms when applicable: FUEL, HUB (active/inactive), TRANSITION SHIFT, SHIFT 1-4, END GAME, TOWER LEVEL 1/2/3, BUMP, TRENCH, DEPOT, OUTPOST, CHUTE.
- Do not introduce non-manual terms or aliases (for example, avoid "bump lane" or "trench lane" if not present in the source data).

Reliability guardrails:
- Do not invent mechanics, point values, RP thresholds, or game-state transitions beyond this summary and the provided input data.
- If team-specific evidence is limited, use neutral phrasing like "auto scoring output", "teleop throughput", "hub-window management", and "endgame contribution".
- Do not assume a team's endgame points come from climbing. Endgame EPA includes both TOWER climb points and FUEL scored during the END GAME window. Without specific scouting data confirming a climb, refer to "endgame contribution" or "endgame output" rather than "climb reliability" or "climb consistency".
- Keep wording practical and drive-team ready; no hype.`;
  }

  if (year === 2025) {
    return `Season context (FRC 2025: REEFSCAPE, official manual-aligned summary):
- Core objective: score CORAL on the REEF (L1-L4), score ALGAE in PROCESSOR/NET, and finish with PARK/CAGE outcomes at the BARGE.
- MATCH flow: AUTO (15s), then TELEOP (2:15).
- 2025 scoring highlights: LEAVE = 3 (AUTO). CORAL points by REEF level: L1 = 3/2 (AUTO/TELEOP), L2 = 4/3, L3 = 6/4, L4 = 7/5. ALGAE: PROCESSOR = 6, NET = 4. BARGE: PARK = 2, shallow CAGE = 6, deep CAGE = 12 (TELEOP values).
- Coopertition interaction: in Qualification MATCHES, if each alliance scores at least 2 ALGAE in its PROCESSOR, all teams receive 1 Coopertition Point and the CORAL RP requirement is reduced.
- 2025 RP framework: AUTO RP (all non-bypassed robots LEAVE + at least 1 CORAL in AUTO), CORAL RP (at least 7 CORAL on each REEF level; reduced to any 3 levels if Coopertition criteria are met), and BARGE RP (at least 16 BARGE points). District Championship/Championship RP thresholds may be higher.

Terminology rules:
- Use official 2025 terms when applicable: CORAL, ALGAE, REEF, PROCESSOR, NET, BARGE, CORAL STATION, PARK, shallow CAGE, deep CAGE, Coopertition Point.

Reliability guardrails:
- Do not invent game actions, point values, or ranking-point logic beyond this summary and the provided input data.
- If team-specific evidence is limited, use neutral phrasing like "game-piece throughput", "scoring consistency", and "endgame reliability".
- Keep wording practical and drive-team ready; no hype.`;
  }

  if (!year) {
    return `Season terminology:
- Prefer event-specific FRC terminology for the event year when known.
- If the season context is unclear, use neutral strategy language and do not invent game-specific mechanics, scoring rules, or RP logic.`;
  }

  return `Season terminology (FRC ${year}):
- Prefer official terminology from the ${year} game manual and kickoff animation.
- Use season-accurate terms only; if uncertain, use neutral strategy language rather than inventing mechanics.
- Keep wording practical and strategy-focused for drive team and scouting use.`;
}
