import { describe, it, expect } from "vitest";
import { filterTeams } from "@/app/dashboard/events/[eventKey]/scouting-overview/scouting-overview-client";
import type { TeamScoutData } from "@/app/dashboard/events/[eventKey]/scouting-overview/scouting-overview-client";

const MOCK_PIT: TeamScoutData["pitScout"] = {
  drivetrain: "Swerve",
  intakeTypes: [],
  scoringRanges: [],
  climbCapability: null,
  autoDescription: null,
  notes: null,
};

const teams: TeamScoutData[] = [
  {
    teamNumber: 254,
    teamName: "The Cheesy Poofs",
    entries: [{} as TeamScoutData["entries"][0], {} as TeamScoutData["entries"][0], {} as TeamScoutData["entries"][0]],
    pitScout: MOCK_PIT,
  },
  {
    teamNumber: 1114,
    teamName: "Simbotics",
    entries: [{} as TeamScoutData["entries"][0]],
    pitScout: null,
  },
  {
    teamNumber: 2056,
    teamName: "OP Robotics",
    entries: [],
    pitScout: null,
  },
];

describe("filterTeams", () => {
  it("returns all teams when query is empty and filter is all", () => {
    expect(filterTeams(teams, "", "all")).toHaveLength(3);
  });

  it("filters by team number substring", () => {
    const result = filterTeams(teams, "254", "all");
    expect(result).toHaveLength(1);
    expect(result[0].teamNumber).toBe(254);
  });

  it("filters by team name (case-insensitive)", () => {
    const result = filterTeams(teams, "simbotics", "all");
    expect(result).toHaveLength(1);
    expect(result[0].teamNumber).toBe(1114);
  });

  it("returns only pit-scouted teams when filter is pit_scouted", () => {
    const result = filterTeams(teams, "", "pit_scouted");
    expect(result).toHaveLength(1);
    expect(result[0].teamNumber).toBe(254);
  });

  it("returns only low-coverage teams when filter is low_coverage", () => {
    const result = filterTeams(teams, "", "low_coverage");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.teamNumber)).toContain(1114);
    expect(result.map((t) => t.teamNumber)).toContain(2056);
  });

  it("applies both query and filter together", () => {
    const result = filterTeams(teams, "op", "low_coverage");
    expect(result).toHaveLength(1);
    expect(result[0].teamNumber).toBe(2056);
  });
});
