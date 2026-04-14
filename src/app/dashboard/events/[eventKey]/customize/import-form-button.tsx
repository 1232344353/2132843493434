"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { copyEventFormConfig } from "@/lib/event-form-actions";
import type { EventFormCopySource } from "@/lib/event-form-config";
import { useToast } from "@/components/toast";

export function ImportFormButton({
  eventKey,
  sources,
}: {
  eventKey: string;
  sources: EventFormCopySource[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(sources[0]?.eventKey ?? "");
  const [isPending, setIsPending] = useState(false);

  async function handleImport() {
    if (!selectedSource) return;

    setIsPending(true);
    const formData = new FormData();
    formData.set("fromEventKey", selectedSource);
    formData.set("toEventKey", eventKey);

    const result = await copyEventFormConfig(formData);
    setIsPending(false);

    if ("error" in result) {
      toast(result.error ?? "Import failed.", "error");
      return;
    }

    setOpen(false);
    toast("Form imported from previous event.", "success");
    router.refresh();
  }

  return (
    <>
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
