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
import type { PriceChanges, Quote } from "@/types/market";

interface WatchlistStore {
  watchlists: Watchlist[];
  activeId: string | null;
  activeItems: WatchlistItem[];
  quotes: Record<string, Quote>;
  priceChanges: Record<string, PriceChanges>;
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

async function fetchPriceChangesFor(
  items: WatchlistItem[],
): Promise<Record<string, PriceChanges>> {
  if (items.length === 0) return {};
  const qs = items.map((i) => `${i.symbol}:${i.market}`).join(",");
  const res = await fetch(
    `/api/market/price-changes?symbols=${encodeURIComponent(qs)}`,
  );
  if (!res.ok) return {};
  return res.json();
}

export const useWatchlistStore = create<WatchlistStore>((set, get) => ({
  watchlists: [],
  activeId: null,
  activeItems: [],
  quotes: {},
  priceChanges: {},
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
        set({ activeId: null, activeItems: [], quotes: {}, priceChanges: {} });
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
        set({ activeItems: [], quotes: {}, priceChanges: {} });
        return;
      }
      const data: Watchlist = await res.json();
      const items = data.items ?? [];
      set({ activeItems: items });
      const [quotes, priceChanges] = await Promise.all([
        fetchQuotesFor(items),
        fetchPriceChangesFor(items),
      ]);
      set({ quotes, priceChanges });
    } finally {
      set({ isLoadingItems: false });
    }
  },

  setActive: (id) => {
    if (id) get().fetchActive(id);
    else set({ activeId: null, activeItems: [], quotes: {}, priceChanges: {} });
  },

  refreshQuotes: async () => {
    const items = get().activeItems;
    const [quotes, priceChanges] = await Promise.all([
      fetchQuotesFor(items),
      fetchPriceChangesFor(items),
    ]);
    set({ quotes, priceChanges });
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
        priceChanges: state.activeId === id ? {} : state.priceChanges,
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
      const qs = encodeURIComponent(`${item.symbol}:${item.market}`);
      const [quoteRes, changesRes] = await Promise.all([
        fetch(`/api/market/quote?symbols=${qs}`),
        fetch(`/api/market/price-changes?symbols=${qs}`),
      ]);
      if (quoteRes.ok) {
        const q = await quoteRes.json();
        set((state) => ({ quotes: { ...state.quotes, ...q } }));
      }
      if (changesRes.ok) {
        const c = await changesRes.json();
        set((state) => ({ priceChanges: { ...state.priceChanges, ...c } }));
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
