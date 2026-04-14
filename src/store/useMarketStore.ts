"use client";

import { create } from "zustand";
import type { Quote } from "@/types/market";
import { isMarketOpen } from "@/lib/utils";

interface MarketStore {
  quotes: Record<string, Quote>;
  isMarketOpen: boolean;
  pollingInterval: ReturnType<typeof setInterval> | null;
  fetchQuotes: (symbols: Array<{ symbol: string; market: string }>) => Promise<void>;
  startPolling: (symbols: Array<{ symbol: string; market: string }>) => void;
  stopPolling: () => void;
  checkMarketStatus: () => void;
}

export const useMarketStore = create<MarketStore>((set, get) => ({
  quotes: {},
  isMarketOpen: false,
  pollingInterval: null,

  checkMarketStatus: () => {
    set({ isMarketOpen: isMarketOpen() });
  },

  fetchQuotes: async (symbols) => {
    if (symbols.length === 0) return;
    try {
      const params = symbols
        .map((s) => `${s.symbol}:${s.market}`)
        .join(",");
      const res = await fetch(`/api/market/quote?symbols=${params}`);
      if (!res.ok) return;
      const data = await res.json();
      set((state) => ({ quotes: { ...state.quotes, ...data } }));
    } catch {
      // silent fail
    }
  },

  startPolling: (symbols) => {
    const { stopPolling, fetchQuotes, checkMarketStatus } = get();
    stopPolling();
    checkMarketStatus();
    fetchQuotes(symbols);

    const intervalMs = isMarketOpen() ? 30000 : 300000;
    const id = setInterval(() => {
      checkMarketStatus();
      fetchQuotes(symbols);
    }, intervalMs);

    set({ pollingInterval: id });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },
}));
