"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SidebarContext } from "@/lib/sidebar-context";
import { PanelLeft } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(true);

  return (
    <SidebarContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      <div className="dashboard-shell">
        <div className="dashboard-backdrop" aria-hidden="true" />

        {showSidebar && (
          <>
            <aside
              className={`fixed left-0 top-0 z-50 hidden h-full flex-col overflow-hidden border-r border-white/[0.10] bg-gradient-to-b from-black via-[#060d14] to-[#0b1e28] transition-[width] duration-300 ease-in-out lg:flex ${
                isOpen ? "w-64" : "w-0"
              }`}
            >
              {sidebar}
            </aside>

            {!isOpen && (
              <button
                onClick={() => setIsOpen(true)}
                title="Open sidebar"
                className="fixed left-4 top-4 z-50 hidden h-8 w-8 items-center justify-center rounded-lg border border-white/[0.10] bg-black text-gray-500 transition hover:text-gray-200 lg:flex"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
          </>
        )}

        <div
          className={`dashboard-content transition-[margin] duration-300 ease-in-out${
            showSidebar
              ? isOpen
                ? " lg:ml-64 pb-20 lg:pb-0"
                : " pb-20 lg:pb-0"
              : ""
          }`}
        >
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
