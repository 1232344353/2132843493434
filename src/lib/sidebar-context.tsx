"use client";

import { createContext, useContext } from "react";

export type SidebarContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const SidebarContext = createContext<SidebarContextValue>({
  isOpen: true,
  open: () => {},
  close: () => {},
});

export const useSidebar = () => useContext(SidebarContext);
