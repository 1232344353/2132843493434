"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Any route under /dashboard/events/[key] (the detail page and its sub-pages)
// gets a full-width layout without the sidebar.
const EVENT_DETAIL_RE = /^\/dashboard\/events\/[^/]+/;

export function DashboardShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const showSidebar = !EVENT_DETAIL_RE.test(pathname);

  return (
    <div className="dashboard-shell">
      <div className="dashboard-backdrop" aria-hidden="true" />
      {showSidebar && sidebar}
      <div
        className={`dashboard-content${showSidebar ? " lg:ml-64 pb-20 lg:pb-0" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
