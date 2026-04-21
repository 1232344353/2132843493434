"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  CalendarDays,
  FileText,
  Settings,
  Shield,
  PanelLeftClose,
} from "lucide-react";
import { useSidebar } from "@/lib/sidebar-context";
import { useTranslation } from "@/components/i18n-provider";
import type { ReactNode } from "react";

const SIDEBAR_PARTICLES = [
  { id: 0, x: 10, delay: 0.0, dur: 6.0, size: 1.5 },
  { id: 1, x: 25, delay: 1.8, dur: 7.5, size: 1.0 },
  { id: 2, x: 42, delay: 0.5, dur: 5.5, size: 2.0 },
  { id: 3, x: 58, delay: 2.4, dur: 6.8, size: 1.0 },
  { id: 4, x: 72, delay: 1.1, dur: 5.2, size: 1.5 },
  { id: 5, x: 86, delay: 3.0, dur: 7.0, size: 1.0 },
  { id: 6, x: 18, delay: 4.2, dur: 6.3, size: 1.0 },
  { id: 7, x: 65, delay: 0.8, dur: 5.8, size: 2.0 },
];

export function SidebarParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {SIDEBAR_PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            bottom: 0,
            backgroundColor: "#43d9a2",
          }}
          animate={{
            y: [0, -320],
            opacity: [0, 0.45, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut",
            times: [0, 0.4, 1],
          }}
        />
      ))}
    </div>
  );
}

import type { TranslationKey } from "@/lib/i18n/en";

interface NavItemDef {
  href: string;
  labelKey: TranslationKey;
  shortLabelKey: TranslationKey;
  exact: boolean;
  icon: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  exact: boolean;
  icon: ReactNode;
}

const BASE_NAV_DEFS: NavItemDef[] = [
  { href: "/dashboard",          labelKey: "nav.dashboard", shortLabelKey: "nav.dashboard", exact: true,  icon: <Home        className="h-4 w-4" strokeWidth={1.75} /> },
  { href: "/dashboard/events",   labelKey: "nav.events",    shortLabelKey: "nav.events",    exact: false, icon: <CalendarDays className="h-4 w-4" strokeWidth={1.75} /> },
  { href: "/dashboard/reports",  labelKey: "nav.reports",   shortLabelKey: "nav.reports",   exact: false, icon: <FileText    className="h-4 w-4" strokeWidth={1.75} /> },
  { href: "/dashboard/settings", labelKey: "nav.settings",  shortLabelKey: "nav.settings",  exact: false, icon: <Settings    className="h-4 w-4" strokeWidth={1.75} /> },
];

const ADMIN_NAV_DEF: NavItemDef = {
  href: "/dashboard/admin",
  labelKey: "nav.admin",
  shortLabelKey: "nav.admin",
  exact: false,
  icon: <Shield className="h-4 w-4" strokeWidth={1.75} />,
};

function useNavItems(isStaff: boolean): NavItem[] {
  const { t } = useTranslation();
  const defs = isStaff ? [...BASE_NAV_DEFS, ADMIN_NAV_DEF] : BASE_NAV_DEFS;
  return defs.map((d) => ({ ...d, label: t(d.labelKey), shortLabel: t(d.shortLabelKey) }));
}

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** Close button — consumes sidebar context. */
export function SidebarCloseButton() {
  const { close } = useSidebar();
  const { t } = useTranslation();
  return (
    <button
      onClick={close}
      title={t("nav.closeSidebar")}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 transition hover:bg-white/[0.06] hover:text-gray-300"
    >
      <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

/** Vertical nav links for the desktop sidebar. */
export function DashboardSidebarLinks({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const items = useNavItems(isStaff);

  return (
    <nav aria-label="Main navigation" className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-100 ${
              active
                ? "bg-white/[0.06] font-medium text-white"
                : "font-normal text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"
            }`}
          >
            <span className={active ? "text-teal-400" : ""}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed bottom tab bar on mobile. */
export function DashboardMobileNav({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const items = useNavItems(isStaff).slice(0, 4);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-end justify-around border-t border-white/[0.10] bg-black lg:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-4 pb-3 pt-2 transition-colors ${
              active ? "text-teal-400" : "text-gray-500"
            }`}
          >
            {item.icon}
            <span className="text-[9px] font-bold uppercase tracking-wider">
              {item.shortLabel}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
