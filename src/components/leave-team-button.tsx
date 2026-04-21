"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveOrganization } from "@/lib/auth-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/components/i18n-provider";

interface LeaveTeamButtonProps {
  label?: string;
}

export function LeaveTeamButton({ label }: LeaveTeamButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  async function checkLeaveEligibility() {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/check-leave-eligibility", {
        method: "GET",
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setWarningMessage(data.error);
        setWarningOpen(true);
        setIsChecking(false);
        return;
      }

      setConfirmOpen(true);
    } catch {
      setError(t("leave.checkFailed"));
    } finally {
      setIsChecking(false);
    }
  }

  function handleLeave() {
    setError(null);
    startTransition(async () => {
      const result = await leaveOrganization();
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
        onClick={checkLeaveEligibility}
        disabled={isPending || isChecking}
        className="inline-flex items-center rounded-lg border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400/60 hover:bg-red-500/10 disabled:opacity-60"
      >
        {isPending || isChecking ? t("common.checking") : (label ?? t("settings.leaveTeam"))}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}

      {/* Warning dialog for ineligibility */}
      <ConfirmDialog
        open={warningOpen}
        title={t("leave.cannotLeave")}
        description={warningMessage ?? ""}
        confirmLabel={t("common.ok")}
        cancelLabel={undefined}
        tone="danger"
        confirmDisabled={false}
        onConfirm={() => {
          setWarningOpen(false);
          setWarningMessage(null);
        }}
        onClose={() => {
          setWarningOpen(false);
          setWarningMessage(null);
        }}
      />

      {/* Confirmation dialog for leaving */}
      <ConfirmDialog
        open={confirmOpen}
        title={t("leave.confirmTitle")}
        description={t("leave.confirmDesc")}
        confirmLabel={isPending ? t("common.leaving") : t("settings.leaveTeam")}
        cancelLabel={t("common.stay")}
        tone="danger"
        confirmDisabled={isPending}
        onConfirm={() => {
          setConfirmOpen(false);
          handleLeave();
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
