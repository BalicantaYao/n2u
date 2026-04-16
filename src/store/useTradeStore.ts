"use client";

import { create } from "zustand";
import type { Trade, CreateTradeInput } from "@/types/trade";

interface TradeFilters {
  symbol?: string;
  market?: string;
  side?: string;
  lotType?: string;
  from?: string;
  to?: string;
}

interface TradeStore {
  trades: Trade[];
  isLoading: boolean;
  filters: TradeFilters;
  fetchTrades: () => Promise<void>;
  addTrade: (data: CreateTradeInput) => Promise<Trade>;
  updateTrade: (id: string, data: Partial<CreateTradeInput>) => Promise<Trade>;
  deleteTrade: (id: string) => Promise<void>;
  setFilters: (f: Partial<TradeFilters>) => void;
  clearFilters: () => void;
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  trades: [],
  isLoading: false,
  filters: {},

  fetchTrades: async () => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      const f = get().filters;
      if (f.symbol) params.set("symbol", f.symbol);
      if (f.market) params.set("market", f.market);
      if (f.side) params.set("side", f.side);
      if (f.lotType) params.set("lotType", f.lotType);
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);

      const res = await fetch(`/api/trades?${params.toString()}`);
      const data = await res.json();
      set({ trades: data });
    } finally {
      set({ isLoading: false });
    }
  },

  addTrade: async (data) => {
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "新增交易失敗");
    }
    const trade = await res.json();
    set((state) => ({ trades: [trade, ...state.trades] }));
    return trade;
  },

  updateTrade: async (id, data) => {
    const res = await fetch(`/api/trades/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "更新交易失敗");
    }
    const updated = await res.json();
    set((state) => ({
      trades: state.trades.map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  },

  deleteTrade: async (id) => {
    await fetch(`/api/trades/${id}`, { method: "DELETE" });
    set((state) => ({ trades: state.trades.filter((t) => t.id !== id) }));
  },

  setFilters: (f) => set((state) => ({ filters: { ...state.filters, ...f } })),
  clearFilters: () => set({ filters: {} }),
}));
