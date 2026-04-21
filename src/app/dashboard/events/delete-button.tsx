"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface DeleteButtonProps {
  orgEventId: string;
  eventName: string;
  eventYear?: number | null;
  isCaptain: boolean;
}

export function DeleteButton({ orgEventId, eventName, eventYear, isCaptain }: DeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function handleDelete() {
    if (!isCaptain) return;
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/events/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgEventId }),
        });
        if (!res.ok) {
          toast("Failed to delete event. Please try again.", "error");
          return;
        }
        toast("Event permanently deleted.", "success");
        router.refresh();
      } catch {
        toast("Failed to delete event. Please try again.", "error");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={!isCaptain || isPending}
        title={
          !isCaptain
            ? "Only captains can delete events"
            : "Delete event permanently"
        }
        className={`group/delete relative flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-200 ${
          isCaptain
            ? "border-white/10 bg-transparent text-gray-500 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
            : "border-white/5 text-gray-600 cursor-not-allowed opacity-50"
        }`}
        aria-label="Delete event"
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
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        )}
      </button>

      <ConfirmDialog
        open={showConfirm}
        title={`Delete "${eventYear ? `${eventYear} ` : ""}${eventName}"?`}
        description="This event will be permanently removed from your organization. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        confirmDisabled={isPending}
        onConfirm={handleConfirm}
        onClose={() => setShowConfirm(false)}
      />
    </>
  );
}
