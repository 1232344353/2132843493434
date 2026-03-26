"use client";

import { OnboardingTour, type TourStep } from "@/components/onboarding-tour";

const MATCHES_TOUR_STEPS: TourStep[] = [
  {
    selector: null,
    titleKey: "tour.matchesWelcome",
    descKey: "tour.matchesWelcomeDesc",
  },
  {
    selector: "[data-tour='matches-header']",
    titleKey: "tour.matchesHeader",
    descKey: "tour.matchesHeaderDesc",
  },
  {
    selector: "[data-tour='matches-tips']",
    titleKey: "tour.matchesTips",
    descKey: "tour.matchesTipsDesc",
  },
  {
    selector:
      "[data-tour='matches-qual-first-card'], [data-tour='matches-playoff-first-card'], [data-tour='matches-qual-grid'], [data-tour='matches-playoff-grid'], [data-tour='matches-grid']",
    titleKey: "tour.matchesGrid",
    descKey: "tour.matchesGridDesc",
  },
  {
    selector: null,
    titleKey: "tour.matchesOffline",
    descKey: "tour.matchesOfflineDesc",
  },
];

export function MatchesTour() {
  return (
    <OnboardingTour
      storageKey="pitpilot_tour_seen_matches"
      steps={MATCHES_TOUR_STEPS}
    />
  );
}
