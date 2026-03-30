"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { copyEventFormConfig } from "@/lib/event-form-actions";
import type { EventFormCopySource } from "@/lib/event-form-config";

export function ImportFormButton({
  eventKey,
  sources,
}: {
  eventKey: string;
  sources: EventFormCopySource[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(sources[0]?.eventKey ?? "");
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function handleImport() {
    if (!selectedSource) return;

    setIsPending(true);
    const formData = new FormData();
    formData.set("fromEventKey", selectedSource);
    formData.set("toEventKey", eventKey);

    const result = await copyEventFormConfig(formData);
    setIsPending(false);

    if ("error" in result) {
      setStatus({ msg: result.error ?? "Import failed.", ok: false });
      return;
    }

    setOpen(false);
    setStatus({ msg: "Form imported from previous event.", ok: true });
    router.refresh();
  }

  return (
    <>
      {status && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 ${status.ok ? "border border-teal-500/30 bg-[#03070a] text-teal-200" : "border border-red-500/30 bg-[#03070a] text-red-200"}`}>
          {status.ok ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-teal-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )}
          {status.msg}
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        disabled={sources.length === 0}
        title={sources.length === 0 ? "No previous customized events available to import." : "Import this form from another event"}
        className="min-w-[9rem]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Import Form
      </Button>

      <ConfirmDialog
        open={open}
        title="Import form from previous event"
        description={(
          <div className="space-y-4">
            <p>
              Copy the full saved form setup from another event. This overwrites the current event&apos;s match scouting, pit scouting, and ability question configuration.
            </p>
            <div>
              <label htmlFor="form-import-source" className="mb-1.5 block text-xs font-medium text-gray-300">
                Source event
              </label>
              <select
                id="form-import-source"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="dashboard-input w-full px-3 py-2 text-sm"
              >
                {sources.map((source) => (
                  <option key={source.eventKey} value={source.eventKey}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        confirmLabel={isPending ? "Importing..." : "Import form"}
        cancelLabel="Cancel"
        tone="warning"
        confirmDisabled={!selectedSource || isPending}
        onConfirm={() => void handleImport()}
        onClose={() => {
          if (isPending) return;
          setOpen(false);
        }}
      />
    </>
  );
}
