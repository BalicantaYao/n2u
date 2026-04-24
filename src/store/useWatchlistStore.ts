"use client";

import { create } from "zustand";
import type {
  Watchlist,
  WatchlistItem,
  CreateWatchlistInput,
  UpdateWatchlistInput,
  CreateWatchlistItemInput,
  UpdateWatchlistItemInput,
} from "@/types/watchlist";
import type { Quote } from "@/types/market";

interface WatchlistStore {
  watchlists: Watchlist[];
  activeId: string | null;
  activeItems: WatchlistItem[];
  quotes: Record<string, Quote>;
  isLoading: boolean;
  isLoadingItems: boolean;

  fetchWatchlists: () => Promise<void>;
  fetchActive: (id: string) => Promise<void>;
  setActive: (id: string | null) => void;
  refreshQuotes: () => Promise<void>;

  createWatchlist: (input: CreateWatchlistInput) => Promise<Watchlist>;
  updateWatchlist: (id: string, input: UpdateWatchlistInput) => Promise<Watchlist>;
  deleteWatchlist: (id: string) => Promise<void>;

  addItem: (watchlistId: string, input: CreateWatchlistItemInput) => Promise<WatchlistItem>;
  updateItem: (itemId: string, input: UpdateWatchlistItemInput) => Promise<WatchlistItem>;
  deleteItem: (itemId: string) => Promise<void>;
}

async function fetchQuotesFor(
  items: WatchlistItem[],
): Promise<Record<string, Quote>> {
  if (items.length === 0) return {};
  const qs = items.map((i) => `${i.symbol}:${i.market}`).join(",");
  const res = await fetch(`/api/market/quote?symbols=${encodeURIComponent(qs)}`);
  if (!res.ok) return {};
  return res.json();
}

export const useWatchlistStore = create<WatchlistStore>((set, get) => ({
  watchlists: [],
  activeId: null,
  activeItems: [],
  quotes: {},
  isLoading: false,
  isLoadingItems: false,

  fetchWatchlists: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/watchlists");
      const data: Watchlist[] = res.ok ? await res.json() : [];
      set({ watchlists: data });
      const { activeId } = get();
      if (!activeId && data.length > 0) {
        await get().fetchActive(data[0].id);
      } else if (activeId && !data.find((w) => w.id === activeId)) {
        set({ activeId: null, activeItems: [], quotes: {} });
        if (data.length > 0) await get().fetchActive(data[0].id);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchActive: async (id: string) => {
    set({ activeId: id, isLoadingItems: true });
    try {
      const res = await fetch(`/api/watchlists/${id}`);
      if (!res.ok) {
        set({ activeItems: [], quotes: {} });
        return;
      }
      const data: Watchlist = await res.json();
      const items = data.items ?? [];
      set({ activeItems: items });
      const quotes = await fetchQuotesFor(items);
      set({ quotes });
    } finally {
      set({ isLoadingItems: false });
    }
  },

  setActive: (id) => {
    if (id) get().fetchActive(id);
    else set({ activeId: null, activeItems: [], quotes: {} });
  },

  refreshQuotes: async () => {
    const quotes = await fetchQuotesFor(get().activeItems);
    set({ quotes });
  },

  createWatchlist: async (input) => {
    const res = await fetch("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "新增名單失敗");
    }
    const watchlist: Watchlist = await res.json();
    set((state) => ({ watchlists: [...state.watchlists, watchlist] }));
    await get().fetchActive(watchlist.id);
    return watchlist;
  },

  updateWatchlist: async (id, input) => {
    const res = await fetch(`/api/watchlists/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "更新名單失敗");
    }
    const updated: Watchlist = await res.json();
    set((state) => ({
      watchlists: state.watchlists.map((w) => (w.id === id ? updated : w)),
    }));
    return updated;
  },

  deleteWatchlist: async (id) => {
    const res = await fetch(`/api/watchlists/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("刪除名單失敗");
    set((state) => {
      const remaining = state.watchlists.filter((w) => w.id !== id);
      const nextActive = state.activeId === id ? null : state.activeId;
      return {
        watchlists: remaining,
        activeId: nextActive,
        activeItems: state.activeId === id ? [] : state.activeItems,
        quotes: state.activeId === id ? {} : state.quotes,
      };
    });
    const { watchlists, activeId } = get();
    if (!activeId && watchlists.length > 0) {
      await get().fetchActive(watchlists[0].id);
    }
  },

  addItem: async (watchlistId, input) => {
    const res = await fetch(`/api/watchlists/${watchlistId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "新增項目失敗");
    }
    const item: WatchlistItem = await res.json();
    if (get().activeId === watchlistId) {
      set((state) => ({ activeItems: [...state.activeItems, item] }));
      const res2 = await fetch(
        `/api/market/quote?symbols=${encodeURIComponent(`${item.symbol}:${item.market}`)}`,
      );
      if (res2.ok) {
        const q = await res2.json();
        set((state) => ({ quotes: { ...state.quotes, ...q } }));
      }
    }
    return item;
  },

  updateItem: async (itemId, input) => {
    const res = await fetch(`/api/watchlists/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "更新項目失敗");
    }
    const updated: WatchlistItem = await res.json();
    set((state) => ({
      activeItems: state.activeItems.map((i) =>
        i.id === itemId ? updated : i,
      ),
    }));
    return updated;
  },

  deleteItem: async (itemId) => {
    const res = await fetch(`/api/watchlists/items/${itemId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("刪除項目失敗");
    set((state) => ({
      activeItems: state.activeItems.filter((i) => i.id !== itemId),
    }));
  },
}));
