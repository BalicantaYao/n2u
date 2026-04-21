"use client";

import { create } from "zustand";
import type {
  Memo,
  CreateMemoInput,
  UpdateMemoInput,
  MemoFilters,
} from "@/types/memo";

interface MemoStore {
  memos: Memo[];
  isLoading: boolean;
  filters: MemoFilters;
  fetchMemos: () => Promise<void>;
  addMemo: (data: CreateMemoInput) => Promise<Memo>;
  updateMemo: (id: string, data: UpdateMemoInput) => Promise<Memo>;
  deleteMemo: (id: string) => Promise<void>;
  setFilters: (f: Partial<MemoFilters>) => void;
  clearFilters: () => void;
}

function sortMemos(memos: Memo[]): Memo[] {
  return [...memos].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });
}

export const useMemoStore = create<MemoStore>((set, get) => ({
  memos: [],
  isLoading: false,
  filters: {},

  fetchMemos: async () => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      const f = get().filters;
      if (f.tag) params.set("tag", f.tag);
      if (f.symbol) params.set("symbol", f.symbol);
      if (f.search) params.set("search", f.search);
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);

      const res = await fetch(`/api/memos?${params.toString()}`);
      const data = await res.json();
      set({ memos: data });
    } finally {
      set({ isLoading: false });
    }
  },

  addMemo: async (data) => {
    const res = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "新增備忘錄失敗");
    }
    const memo: Memo = await res.json();
    set((state) => ({ memos: sortMemos([memo, ...state.memos]) }));
    return memo;
  },

  updateMemo: async (id, data) => {
    const res = await fetch(`/api/memos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "更新備忘錄失敗");
    }
    const updated: Memo = await res.json();
    set((state) => ({
      memos: sortMemos(state.memos.map((m) => (m.id === id ? updated : m))),
    }));
    return updated;
  },

  deleteMemo: async (id) => {
    const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("刪除備忘錄失敗");
    set((state) => ({ memos: state.memos.filter((m) => m.id !== id) }));
  },

  setFilters: (f) => set((state) => ({ filters: { ...state.filters, ...f } })),
  clearFilters: () => set({ filters: {} }),
}));
