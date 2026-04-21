"use client";

import { OnboardingTour, type TourStep } from "@/components/onboarding-tour";

const OVERVIEW_TOUR_STEPS: TourStep[] = [
  {
    selector: null,
    titleKey: "tour.overviewWelcome",
    descKey: "tour.overviewWelcomeDesc",
  },
  {
    selector: "[data-tour='overview-filters']",
    titleKey: "tour.overviewFilters",
    descKey: "tour.overviewFiltersDesc",
  },
  {
    selector: "[data-tour='overview-teams']",
    titleKey: "tour.overviewTeams",
    descKey: "tour.overviewTeamsDesc",
  },
  {
    selector: "[data-tour='overview-ai']",
    titleKey: "tour.overviewAiSummary",
    descKey: "tour.overviewAiSummaryDesc",
  },
];

export function OverviewTour() {
  return (
    <OnboardingTour
      storageKey="pitpilot_tour_seen_scouting_overview"
      steps={OVERVIEW_TOUR_STEPS}
    />
  );
}
