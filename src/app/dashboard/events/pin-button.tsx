"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

interface PinButtonProps {
  orgEventId: string;
  isPinned: boolean;
  isCaptain: boolean;
}

/** Dispatched on the window whenever any event is pinned so sibling PinnedBadges can animate out. */
export const PIN_CHANGED_EVENT = "pitpilot:pin-changed";
export type PinChangedDetail = { pinnedOrgEventId: string };

export function PinButton({ orgEventId, isPinned, isCaptain }: PinButtonProps) {
  const [pinned, setPinned] = useState(isPinned);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  async function toggle() {
    if (!isCaptain) return;
    const next = !pinned;
    setPinned(next);

    startTransition(async () => {
      try {
        const res = await fetch("/api/events/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgEventId, pin: next }),
        });
        if (!res.ok) {
          setPinned(!next);
          toast("Failed to update pin. Please try again.", "error");
          return;
        }
        // Notify sibling PinnedBadges that this event is now the pinned one
        if (next) {
          window.dispatchEvent(
            new CustomEvent<PinChangedDetail>(PIN_CHANGED_EVENT, {
              detail: { pinnedOrgEventId: orgEventId },
            })
          );
          toast("Event pinned to dashboard.", "success");
        } else {
          toast("Event unpinned.", "info");
        }
        router.refresh();
      } catch {
        setPinned(!next);
        toast("Failed to update pin. Please try again.", "error");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!isCaptain || isPending}
      title={
        !isCaptain
          ? "Only captains can pin events"
          : pinned
          ? "Unpin from dashboard"
          : "Pin to dashboard"
      }
      className={`group/pin relative flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-200 ${
        pinned
          ? "border-teal-500/40 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
          : isCaptain
          ? "border-white/10 bg-transparent text-gray-500 hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-400"
          : "border-white/5 text-gray-600 cursor-not-allowed opacity-50"
      }`}
      aria-label={pinned ? "Unpin from dashboard" : "Pin to dashboard"}
      aria-pressed={pinned}
    >
      {isPending ? (
        <svg
          className="animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={pinned ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" x2="12" y1="17" y2="22" />
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
        </svg>
      )}
    </button>
  );
}
