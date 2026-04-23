"use client";

import { create } from "zustand";

export type MarketTab = "TW" | "US";

interface MarketViewStore {
  tab: MarketTab;
  setTab: (tab: MarketTab) => void;
}

const STORAGE_KEY = "n2u-market-view";

function getInitialTab(): MarketTab {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "TW" || saved === "US") return saved;
  }
  return "TW";
}

export const useMarketViewStore = create<MarketViewStore>((set) => ({
  tab: getInitialTab(),
  setTab: (tab) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, tab);
    }
    set({ tab });
  },
}));
