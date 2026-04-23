"use client";

import { create } from "zustand";
import type { CreateOptionTradeInput, OptionTrade } from "@/types/option";

interface OptionFilters {
  symbol?: string;
  action?: string;
  status?: string;
  from?: string;
  to?: string;
}

interface OptionStore {
  options: OptionTrade[];
  isLoading: boolean;
  filters: OptionFilters;
  fetchOptions: () => Promise<void>;
  addOption: (data: CreateOptionTradeInput) => Promise<OptionTrade>;
  updateOption: (
    id: string,
    data: Partial<CreateOptionTradeInput>,
  ) => Promise<OptionTrade>;
  deleteOption: (id: string) => Promise<void>;
  setFilters: (f: Partial<OptionFilters>) => void;
  clearFilters: () => void;
}

export const useOptionStore = create<OptionStore>((set, get) => ({
  options: [],
  isLoading: false,
  filters: {},

  fetchOptions: async () => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      const f = get().filters;
      if (f.symbol) params.set("symbol", f.symbol);
      if (f.action) params.set("action", f.action);
      if (f.status) params.set("status", f.status);
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);

      const res = await fetch(`/api/options?${params.toString()}`);
      const data = await res.json();
      set({ options: data });
    } finally {
      set({ isLoading: false });
    }
  },

  addOption: async (data) => {
    const res = await fetch("/api/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "新增選擇權交易失敗");
    }
    const option = await res.json();
    set((state) => ({ options: [option, ...state.options] }));
    return option;
  },

  updateOption: async (id, data) => {
    const res = await fetch(`/api/options/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "更新選擇權交易失敗");
    }
    const updated = await res.json();
    set((state) => ({
      options: state.options.map((o) => (o.id === id ? updated : o)),
    }));
    return updated;
  },

  deleteOption: async (id) => {
    await fetch(`/api/options/${id}`, { method: "DELETE" });
    set((state) => ({ options: state.options.filter((o) => o.id !== id) }));
  },

  setFilters: (f) => set((state) => ({ filters: { ...state.filters, ...f } })),
  clearFilters: () => set({ filters: {} }),
}));
