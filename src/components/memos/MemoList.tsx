"use client";

import { MemoCard } from "./MemoCard";
import { useT } from "@/lib/i18n";
import type { Memo } from "@/types/memo";

interface Props {
  memos: Memo[];
  isLoading: boolean;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export function MemoList({ memos, isLoading }: Props) {
  const { t } = useT();

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {t("common.loading")}
      </div>
    );
  }

  if (memos.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-center py-12 text-muted-foreground text-sm">
        {t("memos.noRecords")}
      </div>
    );
  }

  // Pinned first group, then day groups
  const pinned = memos.filter((m) => m.pinned);
  const rest = memos.filter((m) => !m.pinned);

  const groups = new Map<string, Memo[]>();
  for (const m of rest) {
    const k = dayKey(m.createdAt);
    const arr = groups.get(k) ?? [];
    arr.push(m);
    groups.set(k, arr);
  }

  return (
    <div className="space-y-5">
      {pinned.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("memos.pinnedSection")}
          </h2>
          <div className="space-y-2">
            {pinned.map((m) => (
              <MemoCard key={m.id} memo={m} />
            ))}
          </div>
        </section>
      )}

      {Array.from(groups.entries()).map(([day, list]) => (
        <section key={day} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {day}
          </h2>
          <div className="space-y-2">
            {list.map((m) => (
              <MemoCard key={m.id} memo={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
