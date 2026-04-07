"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOrganizationAsCaptain } from "@/lib/auth-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface DeleteTeamButtonProps {
  label?: string;
}

export function DeleteTeamButton({ label = "Delete team" }: DeleteTeamButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDeleteTeam() {
    setError(null);
    startTransition(async () => {
      const result = await deleteOrganizationAsCaptain();
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.replace("/join");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        className="inline-flex items-center rounded-lg border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400/60 hover:bg-red-500/10 disabled:opacity-60"
      >
        {isPending ? "Deleting..." : label}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete team?"
        description="This permanently deletes your team workspace, scouting reports, and assignments for everyone on the team."
        confirmLabel={isPending ? "Deleting..." : "Delete team"}
        cancelLabel="Cancel"
        tone="danger"
        confirmDisabled={isPending}
        onConfirm={() => {
          setConfirmOpen(false);
          handleDeleteTeam();
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
