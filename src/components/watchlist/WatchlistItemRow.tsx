"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useT } from "@/lib/i18n";
import { cn, formatCurrency, formatPct, tradingViewUrl } from "@/lib/utils";
import { marketToCurrency } from "@/types/taiwan";
import type { WatchlistItem } from "@/types/watchlist";
import type { Quote } from "@/types/market";
import type { Market } from "@/types/taiwan";
import { WatchlistItemDetail } from "./WatchlistItemDetail";

interface Props {
  item: WatchlistItem;
  quote: Quote | undefined;
}

function marketBadgeVariant(
  m: Market,
): "twse" | "tpex" | "nyse" | "nasdaq" {
  if (m === "NYSE") return "nyse";
  if (m === "NASDAQ") return "nasdaq";
  if (m === "TPEX") return "tpex";
  return "twse";
}

export function WatchlistItemRow({ item, quote }: Props) {
  const { t } = useT();
  const deleteItem = useWatchlistStore((s) => s.deleteItem);
  const [expanded, setExpanded] = useState(false);

  const currency = marketToCurrency(item.market);
  const changePct = quote?.changePct;
  const colorCls =
    changePct == null
      ? "text-muted-foreground"
      : changePct > 0
        ? "text-green-600 dark:text-green-400"
        : changePct < 0
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground";

  async function handleDelete() {
    if (!confirm(t("watchlist.deleteItemConfirm").replace("{symbol}", item.symbol))) {
      return;
    }
    try {
      await deleteItem(item.id);
      toast.success(t("watchlist.itemDeleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("watchlist.deleteFailed"));
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/40 transition-colors rounded-lg"
      >
        <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold">{item.symbol}</span>
            <span className="text-sm text-muted-foreground truncate">
              {item.symbolName ?? ""}
            </span>
            <Badge variant={marketBadgeVariant(item.market)} className="text-xs py-0">
              {item.market}
            </Badge>
          </div>
          {item.note && (
            <span className="text-xs text-muted-foreground line-clamp-1">
              {item.note}
            </span>
          )}
        </div>

        <div className="text-right tabular-nums">
          {quote ? (
            <>
              <div className="text-sm font-medium">
                {formatCurrency(quote.price, currency)}
              </div>
              <div className={cn("text-xs", colorCls)}>
                {changePct != null ? formatPct(changePct) : "—"}
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={tradingViewUrl(item.symbol, item.market)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            title="TradingView"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title={t("common.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t p-3">
          <WatchlistItemDetail item={item} />
        </div>
      )}
    </div>
  );
}
