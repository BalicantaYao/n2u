"use client";

import { create } from "zustand";

interface UIStore {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

const STORAGE_KEY = "sidebar-collapsed";

function getInitialCollapsed(): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY) === "1";
  }
  return false;
}

function persist(collapsed: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: getInitialCollapsed(),
  activeModal: null,
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      persist(next);
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (collapsed) => {
    persist(collapsed);
    set({ sidebarCollapsed: collapsed });
  },
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
