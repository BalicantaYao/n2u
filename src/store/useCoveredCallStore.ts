"use client";

import { create } from "zustand";
import type {
  CoveredCallPosition,
  CreateCoveredCallInput,
  UpdateCoveredCallInput,
  CreateLegInput,
  UpdateLegInput,
} from "@/types/covered-call";

type StatusFilter = "ALL" | "OPEN" | "CLOSED";

interface CoveredCallStore {
  positions: CoveredCallPosition[];
  isLoading: boolean;

  fetch: (status?: StatusFilter) => Promise<void>;
  create: (input: CreateCoveredCallInput) => Promise<CoveredCallPosition>;
  update: (
    id: string,
    input: UpdateCoveredCallInput,
  ) => Promise<CoveredCallPosition>;
  remove: (id: string) => Promise<void>;

  addLeg: (positionId: string, input: CreateLegInput) => Promise<void>;
  updateLeg: (
    positionId: string,
    legId: string,
    input: UpdateLegInput,
  ) => Promise<void>;
  removeLeg: (positionId: string, legId: string) => Promise<void>;
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

export const useCoveredCallStore = create<CoveredCallStore>((set) => {
  /** 後端在異動賣出腳後一律回傳整個底倉，直接替換掉本地那一筆 */
  function replacePosition(position: CoveredCallPosition | null) {
    if (!position) return;
    set((state) => ({
      positions: state.positions.map((p) =>
        p.id === position.id ? position : p,
      ),
    }));
  }

  return {
    positions: [],
    isLoading: false,

    fetch: async (status = "ALL") => {
      set({ isLoading: true });
      try {
        const qs = status === "ALL" ? "" : `?status=${status}`;
        const res = await fetch(`/api/covered-calls${qs}`);
        const data: CoveredCallPosition[] = res.ok ? await res.json() : [];
        set({ positions: data });
      } finally {
        set({ isLoading: false });
      }
    },

    create: async (input) => {
      const res = await fetch("/api/covered-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res, "新增失敗"));
      const position: CoveredCallPosition = await res.json();
      set((state) => ({ positions: [position, ...state.positions] }));
      return position;
    },

    update: async (id, input) => {
      const res = await fetch(`/api/covered-calls/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res, "更新失敗"));
      const position: CoveredCallPosition = await res.json();
      replacePosition(position);
      return position;
    },

    remove: async (id) => {
      const res = await fetch(`/api/covered-calls/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "刪除失敗"));
      set((state) => ({
        positions: state.positions.filter((p) => p.id !== id),
      }));
    },

    addLeg: async (positionId, input) => {
      const res = await fetch(`/api/covered-calls/${positionId}/legs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res, "新增失敗"));
      replacePosition(await res.json());
    },

    updateLeg: async (_positionId, legId, input) => {
      const res = await fetch(`/api/covered-calls/legs/${legId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res, "更新失敗"));
      replacePosition(await res.json());
    },

    removeLeg: async (_positionId, legId) => {
      const res = await fetch(`/api/covered-calls/legs/${legId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res, "刪除失敗"));
      replacePosition(await res.json());
    },
  };
});
