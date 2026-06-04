"use client";

import { create } from "zustand";
import type {
  ObservationTarget,
  CreateObservationInput,
  UpdateObservationInput,
} from "@/types/observation";

interface FetchOpts {
  pending?: boolean;
  archived?: boolean;
}

interface ObservationStore {
  targets: ObservationTarget[];
  isLoading: boolean;

  fetch: (opts?: FetchOpts) => Promise<void>;
  add: (input: CreateObservationInput) => Promise<ObservationTarget>;
  update: (id: string, input: UpdateObservationInput) => Promise<ObservationTarget>;
  check: (id: string, checked?: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useObservationStore = create<ObservationStore>((set, get) => ({
  targets: [],
  isLoading: false,

  fetch: async (opts) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (opts?.pending) params.set("pending", "1");
      if (opts?.archived) params.set("archived", "1");
      const qs = params.toString();
      const res = await fetch(`/api/observations${qs ? `?${qs}` : ""}`);
      const data: ObservationTarget[] = res.ok ? await res.json() : [];
      set({ targets: data });
    } finally {
      set({ isLoading: false });
    }
  },

  add: async (input) => {
    const res = await fetch("/api/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "加入失敗");
    }
    const target: ObservationTarget = await res.json();
    set((state) => {
      const others = state.targets.filter((t) => t.id !== target.id);
      return { targets: [...others, target] };
    });
    return target;
  },

  update: async (id, input) => {
    const res = await fetch(`/api/observations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "更新失敗");
    }
    const updated: ObservationTarget = await res.json();
    set((state) => ({
      targets: state.targets.map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  },

  check: async (id, checked = true) => {
    await get().update(id, { checked });
  },

  remove: async (id) => {
    const res = await fetch(`/api/observations/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("刪除失敗");
    set((state) => ({ targets: state.targets.filter((t) => t.id !== id) }));
  },
}));
