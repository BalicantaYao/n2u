"use client";
import { useCallback, useRef, useState } from "react";

export function useColumnOrder(storageKey: string, defaultOrder: string[]) {
  const defaultRef = useRef(defaultOrder);

  const [order, setOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultRef.current;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (
          Array.isArray(parsed) &&
          parsed.length === defaultRef.current.length &&
          defaultRef.current.every((id) => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    } catch {}
    return defaultRef.current;
  });

  const moveColumn = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [storageKey]
  );

  const resetOrder = useCallback(() => {
    setOrder([...defaultRef.current]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  return { order, moveColumn, resetOrder };
}
