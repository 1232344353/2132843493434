"use client";

import { OnboardingTour, type TourStep } from "@/components/onboarding-tour";

const CUSTOMIZE_TOUR_STEPS: TourStep[] = [
  {
    selector: null,
    titleKey: "tour.customizeWelcome",
    descKey: "tour.customizeWelcomeDesc",
  },
  {
    selector: "[data-tour='customize-header']",
    titleKey: "tour.customizeHeader",
    descKey: "tour.customizeHeaderDesc",
  },
  {
    selector: "[data-tour='customize-actions']",
    titleKey: "tour.customizeActions",
    descKey: "tour.customizeActionsDesc",
  },
  {
    selector: "[data-tour='customize-tabs']",
    titleKey: "tour.customizeTabs",
    descKey: "tour.customizeTabsDesc",
  },
  {
    selector: "[data-tour='customize-match-panel']",
    titleKey: "tour.customizeMatch",
    descKey: "tour.customizeMatchDesc",
  },
  {
    selector: "[data-tour='customize-pit-panel']",
    titleKey: "tour.customizePit",
    descKey: "tour.customizePitDesc",
  },
];

export function CustomizeTour() {
  return (
    <OnboardingTour
      storageKey="pitpilot_tour_seen_customize"
      steps={CUSTOMIZE_TOUR_STEPS}
    />
  );
}
