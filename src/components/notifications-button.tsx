"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { changelog } from "@/content/changelog";
import { useTranslation } from "@/components/i18n-provider";

type NotifType = "feature" | "update" | "fix";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  date: string;
}

function generateNotificationsFromChangelog(): Notification[] {
  return changelog.slice(0, 3).map((entry, index) => {
    // Determine the dominant type from the changes
    const types = entry.changes.map(c => c.type);
    const typeCount = {
      new: types.filter(t => t === "new").length,
      improved: types.filter(t => t === "improved").length,
      fixed: types.filter(t => t === "fixed").length,
    };
    
    let notifType: NotifType = "feature";
    if (typeCount.new > 0) {
      notifType = "feature";
    } else if (typeCount.improved > 0) {
      notifType = "update";
    } else if (typeCount.fixed > 0) {
      notifType = "fix";
    }

    return {
      id: `n${index}`,
      type: notifType,
      title: entry.title,
      body: entry.summary,
      date: entry.week,
    };
  });
}

const NOTIFICATIONS = generateNotificationsFromChangelog();

const STORAGE_KEY = "pitpilot-read-notifications";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({ top: 52, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
    setReadIds(getReadIds());
  }, []);

  const unreadCount = NOTIFICATIONS.filter((n) => !readIds.has(n.id)).length;

  const handleOpen = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const PANEL_W = 300;
      const MARGIN = 8;
      const top = rect.bottom + 8;
      // Prefer left-aligning to the button; fall back to right-aligning
      // when there isn't enough room on the right side.
      if (rect.left + PANEL_W + MARGIN > window.innerWidth) {
        const right = window.innerWidth - rect.right;
        setPanelStyle({ top, right: Math.max(right, MARGIN) });
      } else {
        setPanelStyle({ top, left: Math.max(rect.left, MARGIN) });
      }
    }
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  const markAllRead = useCallback(() => {
    const all = new Set(NOTIFICATIONS.map((n) => n.id));
    setReadIds(all);
    saveReadIds(all);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const allRead = unreadCount === 0;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        aria-label={t("notif.notificationsLabel")}
        className="relative flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-teal-400 text-[8px] font-bold text-gray-950">
            {unreadCount}
          </span>
        )}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                {/* Invisible click-catcher backdrop */}
                <div
                  className="fixed inset-0 z-[998]"
                  onClick={handleClose}
                  aria-hidden="true"
                />

                {/* Dropdown panel */}
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={t("notif.whatsNew")}
                   className="fixed z-[999] w-[300px] rounded-2xl border border-white/[0.1] bg-[#0c1320] shadow-[0_24px_64px_rgba(0,0,0,0.7)] flex flex-col"
                  style={panelStyle}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.75 }}
                >
                  {/* Top glow strip */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-white leading-none mb-0.5">
                        {t("notif.whatsNew")}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {allRead ? t("notif.upToDate") : t("notif.unreadCount", { count: unreadCount })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!allRead && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="rounded-md px-2 py-1 text-[10px] font-medium text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-300"
                        >
                          {t("notif.markAllRead")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClose}
                        aria-label={t("common.close")}
                        className="rounded-md px-2 py-1 text-[10px] font-medium text-gray-600 transition hover:bg-white/[0.06] hover:text-gray-300"
                      >
                        {t("common.close")}
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.06]" />

                  {/* Notification entries */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {allRead ? (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.05 }}
                        className="flex flex-col items-center justify-center gap-1.5 py-9 px-5 text-center"
                      >
                        <p className="text-sm font-medium text-white">{t("notif.allCaughtUp")}</p>
                        <p className="text-xs text-gray-500">{t("notif.noUpdates")}</p>
                      </motion.div>
                    ) : (
                      NOTIFICATIONS.map((n, i) => {
                        const isUnread = !readIds.has(n.id);
                        return (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 + i * 0.04, duration: 0.18 }}
                            className={`relative px-4 py-3.5 transition-colors ${
                              isUnread ? "bg-teal-500/[0.03]" : "opacity-60"
                            }`}
                          >
                            {isUnread && (
                              <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-teal-400/60" />
                            )}
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-[10px] text-gray-600">{n.date}</span>
                            </div>
                            <p className="text-xs font-semibold text-white leading-snug">
                              {n.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
                              {n.body}
                            </p>
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="h-px bg-white/[0.06]" />
                  <div className="px-4 py-3">
                    <Link
                      href="/changelog"
                      onClick={handleClose}
                      className="flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 text-xs font-medium text-gray-400 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
                    >
                      {t("notif.viewChangelog")}
                    </Link>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
