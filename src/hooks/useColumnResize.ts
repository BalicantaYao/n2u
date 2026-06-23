"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useColumnResize(storageKey: string, defaultWidths: number[]) {
  const [widths, setWidths] = useState<number[]>(() => {
    if (typeof window === "undefined") return defaultWidths;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as number[];
        if (Array.isArray(parsed) && parsed.length === defaultWidths.length) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return defaultWidths;
  });

  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const dragState = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const startResize = useCallback(
    (colIndex: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      dragState.current = {
        colIndex,
        startX: e.clientX,
        startWidth: widthsRef.current[colIndex],
      };
    },
    []
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragState.current) return;
      const { colIndex, startX, startWidth } = dragState.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(40, startWidth + delta);
      setWidths((prev) => {
        const next = [...prev];
        next[colIndex] = newWidth;
        return next;
      });
    }

    function onMouseUp() {
      if (!dragState.current) return;
      dragState.current = null;
      try {
        localStorage.setItem(storageKey, JSON.stringify(widthsRef.current));
      } catch {
        // ignore
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [storageKey]);

  return { widths, startResize };
}
