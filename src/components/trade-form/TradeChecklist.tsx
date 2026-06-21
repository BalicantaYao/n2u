"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { CheckSquare, Square, ClipboardList } from "lucide-react";

interface TradeChecklistProps {
  items: string[];
}

export function TradeChecklist({ items }: TradeChecklistProps) {
  const { t } = useT();
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));

  if (items.length === 0) return null;

  function toggle(index: number) {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === items.length;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="h-4 w-4" />
          <span>{t("trade.checklistTitle")}</span>
        </div>
        <span className={`text-xs tabular-nums ${allDone ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground"}`}>
          {doneCount} / {items.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className={`flex items-start gap-2 w-full text-left text-sm transition-colors rounded px-1 py-0.5 hover:bg-muted/50 ${
                checked[i] ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {checked[i] ? (
                <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
              ) : (
                <Square className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              )}
              <span>{item}</span>
            </button>
          </li>
        ))}
      </ul>

      {!allDone && (
        <p className="text-xs text-muted-foreground">
          {t("trade.checklistReminder")}
        </p>
      )}
    </div>
  );
}
