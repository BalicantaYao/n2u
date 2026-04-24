"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MemoComposer } from "@/components/memos/MemoComposer";
import { MemoCard } from "@/components/memos/MemoCard";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useT } from "@/lib/i18n";
import type { WatchlistItem } from "@/types/watchlist";
import type { Memo } from "@/types/memo";

interface Props {
  item: WatchlistItem;
}

export function WatchlistItemDetail({ item }: Props) {
  const { t } = useT();
  const updateItem = useWatchlistStore((s) => s.updateItem);

  const [note, setNote] = useState(item.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMemos = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/memos?symbol=${encodeURIComponent(item.symbol)}`,
      );
      if (res.ok) setMemos(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, [item.symbol]);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  async function handleSaveNote() {
    setSavingNote(true);
    try {
      await updateItem(item.id, { note });
      toast.success(t("watchlist.noteSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("watchlist.saveFailed"));
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t("watchlist.shortNote")}
        </label>
        <div className="flex items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("watchlist.notePlaceholder")}
            className="h-8 text-sm"
            maxLength={200}
          />
          <Button
            size="sm"
            onClick={handleSaveNote}
            disabled={savingNote || note === (item.note ?? "")}
            className="h-8"
          >
            {t("common.save")}
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("watchlist.addMemoForSymbol").replace("{symbol}", item.symbol)}
        </h3>
        <MemoComposer
          defaultLinkedSymbol={item.symbol}
          lockLinkedSymbol
          onSubmitted={loadMemos}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("watchlist.relatedMemos").replace("{symbol}", item.symbol)}
          {memos.length > 0 && (
            <span className="ml-1 text-muted-foreground/70">({memos.length})</span>
          )}
        </h3>
        {isLoading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : memos.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 text-center py-6 text-sm text-muted-foreground">
            {t("watchlist.noMemosYet")}
          </div>
        ) : (
          <div className="space-y-2">
            {memos.map((m) => (
              <MemoCard key={m.id} memo={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
