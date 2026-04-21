"use client";

import { OnboardingTour, type TourStep } from "@/components/onboarding-tour";

const EVENTS_LIST_TOUR_STEPS: TourStep[] = [
  {
    selector: null,
    titleKey: "tour.eventsListWelcome",
    descKey: "tour.eventsListWelcomeDesc",
  },
  {
    selector: "[data-tour='events-sync-form']",
    titleKey: "tour.eventsSyncForm",
    descKey: "tour.eventsSyncFormDesc",
  },
  {
    selector: "[data-tour='events-grid']",
    titleKey: "tour.eventsGrid",
    descKey: "tour.eventsGridDesc",
  },
];

export function EventsListTour() {
  return (
    <OnboardingTour
      storageKey="pitpilot_tour_seen_events_list"
      steps={EVENTS_LIST_TOUR_STEPS}
    />
  );
}
