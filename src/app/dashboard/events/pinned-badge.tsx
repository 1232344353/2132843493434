"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PIN_CHANGED_EVENT, type PinChangedDetail } from "./pin-button";

/**
 * Renders the "PINNED" badge with an exit animation when another event is pinned.
 * Receives the initial pinned state from the server; listens for cross-card events
 * so the badge animates away instantly rather than waiting for router.refresh().
 */
export function PinnedBadge({
  orgEventId,
  initialPinned,
}: {
  orgEventId: string;
  initialPinned: boolean;
}) {
  const [pinned, setPinned] = useState(initialPinned);

  useEffect(() => {
    function handler(e: Event) {
      const { pinnedOrgEventId } = (e as CustomEvent<PinChangedDetail>).detail;
      // Another event was just pinned — unpin this one
      if (pinnedOrgEventId !== orgEventId) {
        setPinned(false);
      }
    }
    window.addEventListener(PIN_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PIN_CHANGED_EVENT, handler);
  }, [orgEventId]);

  return (
    <AnimatePresence>
      {pinned && (
        <motion.span
          key="pinned-badge"
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.75, y: -4 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 1, 1] }}
          className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-400 ring-1 ring-teal-500/20"
        >
          Pinned
        </motion.span>
      )}
    </AnimatePresence>
  );
}
