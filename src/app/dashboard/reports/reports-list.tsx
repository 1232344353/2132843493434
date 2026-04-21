"use client";

import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { useTranslation } from "@/components/i18n-provider";
import {
  deleteAllScoutingReports,
  deleteEventScoutingReports,
} from "@/lib/scouting-report-actions";

export type EventGroup = {
  tbaKey: string;
  eventId: string;
  eventTitle: string;
  location: string | null;
  matchEntries: { id: string; created_at: string }[];
  pitEntries: { id: string; created_at: string }[];
};

function EventRow({
  group,
  isCaptain,
}: {
  group: EventGroup;
  isCaptain: boolean;
}) {
  const { t } = useTranslation();
  const totalEntries = group.matchEntries.length + group.pitEntries.length;
  const canOpen = group.tbaKey !== "__unknown__";

  return (
    <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200 hover:border-teal-500/20 hover:shadow-[0_6px_28px_rgba(0,0,0,0.35)] hover:-translate-y-0.5">

      <div className="flex items-center gap-4 px-5 py-4">
        {/* Clickable left area */}
        {canOpen ? (
          <Link
            href={`/dashboard/events/${group.tbaKey}/scouting-overview`}
            className="min-w-0 flex-1"
          >
            <p className="text-sm font-bold text-white transition-colors group-hover:text-teal-100">
              {group.eventTitle}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {group.matchEntries.length} match{" "}
              {group.matchEntries.length === 1 ? "entry" : "entries"}
              {group.pitEntries.length > 0 &&
                ` · ${group.pitEntries.length} pit ${group.pitEntries.length === 1 ? "scout" : "scouts"}`}
            </p>
          </Link>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">{group.eventTitle}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {group.matchEntries.length} match{" "}
              {group.matchEntries.length === 1 ? "entry" : "entries"}
              {group.pitEntries.length > 0 &&
                ` · ${group.pitEntries.length} pit ${group.pitEntries.length === 1 ? "scout" : "scouts"}`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {isCaptain && group.eventId && (
            <form
              action={
                deleteEventScoutingReports as unknown as (
                  formData: FormData
                ) => void
              }
            >
              <input type="hidden" name="eventId" value={group.eventId} />
              <ConfirmButton
                type="submit"
                title={`Delete all reports for ${group.eventTitle}?`}
                description={`This permanently deletes all ${totalEntries} scouting ${totalEntries === 1 ? "entry" : "entries"} for this event. This cannot be undone.`}
                confirmLabel={t("reports.deleteEventReports")}
                cancelLabel={t("common.cancel")}
                tone="danger"
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-300/70 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300"
              >
                {t("reports.deleteEventReports")}
              </ConfirmButton>
            </form>
          )}
          {canOpen && (
            <Link
              href={`/dashboard/events/${group.tbaKey}/scouting-overview`}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-300"
            >
              {t("reports.openReports")}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportsList({
  eventGroups,
  orgId: _orgId,
  isCaptain,
  userId: _userId,
}: {
  eventGroups: EventGroup[];
  orgId: string;
  isCaptain: boolean;
  userId: string;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
            {t("reports.scoutingHistory")}
          </p>
          <h1 className="text-2xl font-bold text-white">
            {t("reports.myScouting")}
          </h1>
          <p className="text-sm text-gray-400">{t("reports.description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isCaptain ? (
            <form
              action={
                deleteAllScoutingReports as unknown as (
                  formData: FormData
                ) => void
              }
            >
              <ConfirmButton
                type="submit"
                title="Delete all scouting reports?"
                description="This permanently deletes every scouting entry submitted by your team. This cannot be undone."
                confirmLabel={t("reports.deleteAllReports")}
                cancelLabel={t("common.cancel")}
                tone="danger"
                className="rounded-lg border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400/60 hover:bg-red-500/10"
              >
                {t("reports.deleteAllReports")}
              </ConfirmButton>
            </form>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-lg border border-red-500/20 px-3 py-2 text-sm font-semibold text-red-300/50 opacity-60"
              title={t("reports.onlyCaptains")}
            >
              {t("reports.deleteAllReports")}
            </button>
          )}
          <Link href="/dashboard" className="back-button">
            {t("common.backToDashboard")}
          </Link>
        </div>
      </div>

      {eventGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed dashboard-panel p-8 text-center text-sm text-gray-400">
          {t("reports.noReports")}
        </div>
      ) : (
        <div className="space-y-3">
          {eventGroups.map((group) => (
            <EventRow key={group.tbaKey} group={group} isCaptain={isCaptain} />
          ))}
        </div>
      )}
    </>
  );
}
