export type ChangeType = "new" | "improved" | "fixed";

export interface ChangeEntry {
  type: ChangeType;
  text: string;
}

export interface ChangelogWeek {
  week: string;
  title: string;
  summary: string;
  changes: ChangeEntry[];
}

export const changelog: ChangelogWeek[] = [
  {
    week: "Apr 6",
    title: "Spanish and French",
    summary: "The full app now speaks your language, and captains can clean up reports from scouts who've left.",
    changes: [
      { type: "improved", text: "Language switching now applies to every page in the app, not just the profile menu" },
      { type: "improved", text: "Removed Team Pulse to simplify the team communication workflow" },
      { type: "new", text: "Spanish and French translations cover all dashboard, event, match, analytics, and scouting screens" },
      { type: "fixed", text: "Captains can now delete scouting reports submitted by teammates who left the team" },
    ],
  },
  {
    week: "Mar 29",
    title: "Customize your scouting form",
    summary: "Captains can now build a form that fits your game plan, not a generic template.",
    changes: [
      { type: "new", text: "Hide sections you don't need: auto, endgame, ratings, or ability questions" },
      { type: "new", text: "Add custom fields with counters, toggles, multi-selects, ratings, and free text" },
      { type: "new", text: "Form configs are per-event, so your regional setup stays separate from champs" },
      { type: "new", text: "Copy a config from a previous event with one click" },
      { type: "improved", text: "Ability questions moved into the scouting form itself, where they belong" },
    ],
  },
  {
    week: "Mar 25",
    title: "Improved offline scouting and pit scouting",
    summary: "Spotty pit WiFi won't stop your scouts. Entries save locally and sync when you're back online.",
    changes: [
      { type: "new", text: "Match scouting saves to the device when offline and syncs automatically when connection returns" },
      { type: "new", text: "Pending entries show in a queue so scouts can see what hasn't uploaded yet" },
      { type: "new", text: "Pit scouting form covers drivetrain, intake, scoring ranges, shooter output, and climbing" },
      { type: "new", text: "Pit scouting data shows on each team's page alongside match stats and AI briefs" },
      { type: "improved", text: "Event sync now has a manual trigger on the matches page when no schedule is loaded yet" },
    ],
  },
  {
    week: "Feb 18",
    title: "AI pick list and live scouting",
    summary: "The two things alliance captains actually need: a ranked list and data that updates as scouts submit.",
    changes: [
      { type: "new", text: "AI pick list ranks every team for first pick, second pick, and do-not-pick based on your scouting weights" },
      { type: "new", text: "Scouting entries appear in analytics the moment scouts submit, no refresh needed" },
      { type: "new", text: "Strategy chat lets you ask anything about teams at your event" },
      { type: "improved", text: "Per-team analytics with match-by-match breakdown and CSV export" },
    ],
  },
  {
    week: "Feb 11",
    title: "Draft board and AI briefs",
    summary: "Run your alliance selection from PitPilot and get AI-generated match prep for every team.",
    changes: [
      { type: "new", text: "Live draft board for alliance selection, picks persist across devices" },
      { type: "new", text: "AI match briefs summarize a team's auto, teleop, and endgame based on your scouting data" },
      { type: "new", text: "Scout assignments so everyone knows which match and which team they're watching" },
      { type: "new", text: "Invite scouts by email, assign captain or scout roles" },
    ],
  },
  {
    week: "Feb 9",
    title: "PitPilot launches",
    summary: "Everything you need to scout a regional, in one place.",
    changes: [
      { type: "new", text: "Match scouting form with alliance breakdowns and per-match notes" },
      { type: "new", text: "Event sync pulls the schedule, team list, and results from The Blue Alliance" },
      { type: "new", text: "Team pages with Statbotics EPA, match history, and scouting data side by side" },
    ],
  },
];
