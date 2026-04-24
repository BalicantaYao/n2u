"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SymbolSearch } from "@/components/trade-form/SymbolSearch";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useT } from "@/lib/i18n";
import type { Market } from "@/types/taiwan";

interface Props {
  watchlistId: string;
}

export function AddItemForm({ watchlistId }: Props) {
  const { t } = useT();
  const addItem = useWatchlistStore((s) => s.addItem);

  const [symbol, setSymbol] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [market, setMarket] = useState<Market | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setSymbol("");
    setSymbolName("");
    setMarket(null);
    setNote("");
  }

  async function handleAdd() {
    if (!symbol || !market) {
      toast.error(t("watchlist.selectStockFirst"));
      return;
    }
    setSubmitting(true);
    try {
      await addItem(watchlistId, {
        symbol,
        market,
        symbolName: symbolName || undefined,
        note: note.trim() || undefined,
      });
      toast.success(t("watchlist.itemAdded"));
      reset();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("watchlist.saveFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <SymbolSearch
          value={symbol ? `${symbol} ${symbolName}` : ""}
          onChange={(sym, name, mkt) => {
            setSymbol(sym);
            setSymbolName(name);
            setMarket(mkt);
          }}
          placeholder={t("watchlist.searchPlaceholder")}
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("watchlist.notePlaceholder")}
          className="h-9"
          maxLength={200}
        />
        <Button
          onClick={handleAdd}
          disabled={submitting || !symbol || !market}
          size="sm"
          className="h-9"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("watchlist.addItem")}
        </Button>
      </div>
    </div>
  );
}
