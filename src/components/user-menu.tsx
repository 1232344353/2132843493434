"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "@/lib/auth-actions";
import { useTranslation } from "@/components/i18n-provider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { getPendingCount } from "@/lib/offline-queue";
import { clearAllOfflineData } from "@/lib/offline-cleanup";
import { UserAvatar } from "@/components/user-avatar";
import { ChevronUp } from "lucide-react";

type PlanTier = "free" | "supporter" | "gifted_supporter";

interface UserMenuProps {
  name: string;
  email: string;
  isStaff: boolean;
  dropUp?: boolean;
  expanded?: boolean;
  role?: string;
  planTier?: PlanTier;
}

export function UserMenu({
  name,
  email,
  isStaff,
  dropUp = false,
  expanded = false,
  role,
  planTier,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { locale, setLocale, t } = useTranslation();

  const refreshPending = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  useEffect(() => {
    void refreshPending();
    const interval = setInterval(() => void refreshPending(), 10000);
    return () => clearInterval(interval);
  }, [refreshPending]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // ── Dashboard (expanded/sidebar) menu ──────────────────────────────────────
  const dashboardMenu = (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="overflow-hidden"
    >
      {pendingCount > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5">
          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          <p className="text-[11px] font-medium text-amber-300">
            {pendingCount} {pendingCount === 1 ? "entry" : "entries"} pending sync
          </p>
        </div>
      )}

      {/* Nav links */}
      <div className={`py-1 ${pendingCount > 0 ? "mt-2 border-t border-white/[0.06]" : ""}`}>
        <Link
          href="/dashboard/settings/account"
          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 transition hover:bg-white/[0.05] hover:text-white"
          onClick={() => setOpen(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-600">
            <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
          </svg>
          Account Settings
        </Link>

        {isStaff && (
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 transition hover:bg-white/[0.05] hover:text-white"
            onClick={() => setOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-600">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            Website Admin
          </Link>
        )}
      </div>

      {/* Language */}
      <div className="border-t border-white/[0.06] px-4 py-3">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          {t("menu.language")}
        </p>
        <div className="grid grid-cols-3 gap-1">
          {LOCALES.map((loc) => {
            const active = locale === loc;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => setLocale(loc as Locale)}
                className={`relative rounded-lg py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30"
                    : "text-gray-500 hover:bg-white/[0.05] hover:text-gray-300"
                }`}
              >
                {active && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 flex h-1 w-1 rounded-full bg-teal-400" />
                )}
                {LOCALE_LABELS[loc as Locale]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sign out */}
      <div className="border-t border-white/[0.06] px-4 py-3">
        <button
          type="button"
          onClick={async () => {
            try {
              await clearAllOfflineData();
            } catch {
              // Best effort
            }
            await signOut();
          }}
          className="flex w-full items-center gap-2.5 text-sm font-medium text-gray-500 transition hover:text-red-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {t("menu.signOut")}
        </button>
      </div>
    </motion.div>
  );

  // ── Floating menu (used outside the dashboard, e.g. landing page) ──────────
  const floatingMenuContent = (
    <>
      <div className="px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white leading-snug">
              {name || "Account"}
            </p>
            <p className="truncate text-[11px] text-gray-500 mt-0.5">{email}</p>
          </div>
        </div>
      </div>

      <div className="py-1">
        <Link
          href="/dashboard/settings/account"
          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/[0.05] hover:text-white"
          role="menuitem"
          onClick={() => setOpen(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-500">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          {t("menu.accountSettings")}
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/[0.05] hover:text-white"
          role="menuitem"
          onClick={() => setOpen(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-500">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          {t("menu.dashboard")}
        </Link>
        {isStaff && (
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/[0.05] hover:text-white"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-500">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            {t("menu.admin")}
          </Link>
        )}
      </div>

      <div className="border-t border-white/[0.07] px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          {t("menu.language")}
        </p>
        <div className="flex flex-wrap gap-1">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocale(loc as Locale)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                locale === loc
                  ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30"
                  : "text-gray-500 hover:bg-white/[0.05] hover:text-gray-300"
              }`}
            >
              {LOCALE_LABELS[loc as Locale]}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.07] px-4 py-3">
        <button
          type="button"
          onClick={async () => {
            try {
              await clearAllOfflineData();
            } catch {
              // Best effort
            }
            await signOut();
          }}
          className="flex w-full items-center gap-2.5 text-sm font-medium text-red-400 transition hover:text-red-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {t("menu.signOut")}
        </button>
      </div>
    </>
  );

  // Suppress unused warning — planTier kept in props for future use
  void planTier;

  return (
    <div ref={rootRef} className={`relative ${expanded ? "w-full" : ""}`}>
      {/* ── Expanded sidebar mode ── */}
      {expanded ? (
        <div className="w-full">
          <AnimatePresence>
            {open && (
              <div
                role="menu"
                data-lenis-prevent
                className="mb-1.5 rounded-xl border border-white/[0.08] bg-[#0c1118]"
              >
                {dashboardMenu}
              </div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/[0.04]"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Open account menu"
          >
            <div className="relative shrink-0">
              <UserAvatar name={name || email} size={34} />
              {pendingCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow"
                  aria-label={`${pendingCount} entries pending sync`}
                >
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-white leading-snug">
                {name || "Account"}
              </p>
              {role && (
                <p className="text-[11px] font-medium capitalize text-gray-500 mt-0.5 leading-tight">
                  {role}
                </p>
              )}
            </div>
            <ChevronUp
              size={13}
              className={`shrink-0 text-gray-600 transition-transform group-hover:text-gray-400 ${
                open ? "rotate-0" : "rotate-180"
              }`}
            />
          </button>
        </div>
      ) : (
        /* ── Avatar-only floating mode ── */
        <>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="group relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-teal-500/20 active:scale-95"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Open account menu"
          >
            <UserAvatar name={name || email} size={36} />
            {pendingCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow"
                aria-label={`${pendingCount} entries pending sync`}
              >
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                role="menu"
                data-lenis-prevent
                initial={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: dropUp ? 4 : -4, scale: 0.97 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`absolute w-72 max-h-[calc(100vh-120px)] max-w-[calc(100vw-24px)] overflow-hidden overflow-y-auto rounded-xl border border-white/10 bg-gray-950/95 text-white shadow-2xl backdrop-blur-md ${
                  dropUp ? "bottom-full left-0 mb-2" : "right-0 mt-2"
                }`}
              >
                {floatingMenuContent}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
