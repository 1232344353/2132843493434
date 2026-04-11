"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavLink {
  href: string;
  label: string;
  shortLabel: string;
  exact: boolean;
  icon: ReactNode;
}

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

const EventsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ReportsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const AdminIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const BASE_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Dash", exact: true, icon: <HomeIcon /> },
  { href: "/dashboard/events", label: "Events", shortLabel: "Events", exact: false, icon: <EventsIcon /> },
  { href: "/dashboard/reports", label: "Reports", shortLabel: "Reports", exact: false, icon: <ReportsIcon /> },
  { href: "/dashboard/settings", label: "Settings", shortLabel: "Settings", exact: false, icon: <SettingsIcon /> },
];

const ADMIN_LINK: NavLink = {
  href: "/dashboard/admin",
  label: "Admin",
  shortLabel: "Admin",
  exact: false,
  icon: <AdminIcon />,
};

function useNavLinks(isStaff: boolean) {
  return isStaff ? [...BASE_LINKS, ADMIN_LINK] : BASE_LINKS;
}

function isLinkActive(link: NavLink, pathname: string) {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

/** Vertical nav links rendered inside the desktop sidebar `<aside>`. */
export function DashboardSidebarLinks({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const links = useNavLinks(isStaff);

  return (
    <nav aria-label="Main navigation">
      {links.map((link) => {
        const active = isLinkActive(link, pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
              active
                ? "border-r-2 border-teal-400 bg-teal-400/[0.07] text-teal-400"
                : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100"
            }`}
          >
            {link.icon}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed bottom tab bar shown on mobile (lg:hidden). */
export function DashboardMobileNav({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const links = useNavLinks(isStaff).slice(0, 4);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-end justify-around border-t border-white/[0.05] bg-[#0a0f12] lg:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {links.map((link) => {
        const active = isLinkActive(link, pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center gap-1 px-4 pb-3 pt-2 transition-colors ${
              active ? "text-teal-400" : "text-gray-500"
            }`}
          >
            {link.icon}
            <span className="text-[9px] font-bold uppercase tracking-wider">
              {link.shortLabel}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
