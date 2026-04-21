"use client";

import { useMemo } from "react";
import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMemoStore } from "@/store/useMemoStore";
import { useT } from "@/lib/i18n";
import { stringToTags } from "@/lib/memo-tags";
import { cn } from "@/lib/utils";
import type { Memo } from "@/types/memo";

interface Props {
  memos: Memo[];
}

export function MemoFilters({ memos }: Props) {
  const { t } = useT();
  const filters = useMemoStore((s) => s.filters);
  const setFilters = useMemoStore((s) => s.setFilters);
  const clearFilters = useMemoStore((s) => s.clearFilters);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const m of memos) {
      for (const t of stringToTags(m.tags)) set.add(t);
    }
    return Array.from(set).sort();
  }, [memos]);

  const hasActiveFilter =
    !!filters.tag || !!filters.symbol || !!filters.search;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("memos.searchPlaceholder")}
            className="h-9 w-44 md:w-60 pl-7 text-sm"
            value={filters.search ?? ""}
            onChange={(e) =>
              setFilters({ search: e.target.value || undefined })
            }
          />
        </div>
        <Input
          placeholder={t("memos.symbolFilter")}
          className="h-9 w-28 md:w-32 text-sm"
          value={filters.symbol ?? ""}
          onChange={(e) =>
            setFilters({ symbol: e.target.value.toUpperCase() || undefined })
          }
          maxLength={12}
        />
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={clearFilters}
          >
            <X className="h-4 w-4 mr-1" />
            {t("common.clear")}
          </Button>
        )}
      </div>
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("memos.tagFilter")}
          </span>
          {allTags.map((tag) => {
            const active = filters.tag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setFilters({ tag: active ? undefined : tag })
                }
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-accent"
                )}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
