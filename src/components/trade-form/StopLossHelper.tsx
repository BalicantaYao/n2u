"use client";

import { useState, useEffect, useRef } from "react";
import { formatTWD, cn } from "@/lib/utils";
import { ChevronDown, Loader2, AlertTriangle, TrendingDown } from "lucide-react";
import type { Market, Side } from "@/types/taiwan";
import type { StopLossHelperResponse, StopLossSuggestion } from "@/types/market";

interface StopLossHelperProps {
  symbol: string;
  market: Market;
  entryPrice: number;
  newShares: number;
  side: Side;
  onSelectStopLoss: (price: number) => void;
}

const CATEGORY_LABELS: Record<StopLossSuggestion["category"], string> = {
  percentage: "固定百分比",
  atr: "波動率 (ATR)",
  support: "技術支撐",
  ma: "均線",
  limit: "跌停板",
};

const CATEGORY_ORDER: StopLossSuggestion["category"][] = [
  "percentage",
  "atr",
  "support",
  "ma",
  "limit",
];

export function StopLossHelper({
  symbol,
  market,
  entryPrice,
  newShares,
  side,
  onSelectStopLoss,
}: StopLossHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<StopLossHelperResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedStrategy, setAppliedStrategy] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canFetch = side === "BUY" && symbol && entryPrice > 0;

  // Fetch suggestions when panel is open and inputs change
  useEffect(() => {
    if (!isOpen || !canFetch) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        symbol,
        market,
        entryPrice: String(entryPrice),
        newShares: String(newShares || 0),
      });

      fetch(`/api/market/stop-loss-helper?${params}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error("API error");
          return res.json();
        })
        .then((json: StopLossHelperResponse) => {
          setData(json);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("無法取得停損建議，請稍後再試");
          setLoading(false);
        });
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [isOpen, symbol, market, entryPrice, newShares, canFetch]);

  // Reset applied strategy when symbol or price changes
  useEffect(() => {
    setAppliedStrategy(null);
  }, [symbol, entryPrice]);

  if (!canFetch) {
    return (
      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
        請輸入股票代碼與買進價格以取得停損建議
      </div>
    );
  }

  function handleApply(suggestion: StopLossSuggestion) {
    onSelectStopLoss(suggestion.price);
    setAppliedStrategy(suggestion.strategy);
  }

  // Group suggestions by category
  const grouped = data
    ? CATEGORY_ORDER.reduce(
        (acc, cat) => {
          const items = data.suggestions.filter((s) => s.category === cat);
          if (items.length > 0) acc.push({ category: cat, items });
          return acc;
        },
        [] as { category: StopLossSuggestion["category"]; items: StopLossSuggestion[] }[]
      )
    : [];

  const positionImpact = data?.positionImpact;
  const hasExistingPosition =
    data?.existingPosition != null && data.existingPosition.totalShares > 0;

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          停損建議助手
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在分析...
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <p className="text-sm text-destructive py-2">{error}</p>
          )}

          {/* Data loaded */}
          {data && !loading && (
            <>
              {/* Position impact banner */}
              {hasExistingPosition && positionImpact && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    加碼提示：您已持有此股票
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs ml-6">
                    <span>目前持有</span>
                    <span className="tabular-nums text-right">
                      {data.existingPosition!.totalShares.toLocaleString()} 股 / 均價{" "}
                      {data.existingPosition!.avgPricePerShare.toFixed(2)}
                    </span>
                    <span>加碼後</span>
                    <span className="tabular-nums text-right">
                      {positionImpact.newTotalShares.toLocaleString()} 股 / 新均價{" "}
                      {positionImpact.newAvgPrice.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs ml-6 mt-1 opacity-80">
                    以下建議依據新均價計算
                  </p>
                </div>
              )}

              {/* No historical data notice */}
              {!data.meta.hasHistoricalData && (
                <p className="text-xs text-muted-foreground">
                  歷史資料不足，僅顯示基本建議
                </p>
              )}

              {/* Suggestion groups */}
              {grouped.map(({ category, items }) => (
                <div key={category} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {CATEGORY_LABELS[category]}
                  </p>
                  {items.map((s) => (
                    <button
                      key={s.strategy}
                      type="button"
                      onClick={() => handleApply(s)}
                      title={s.description}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                        appliedStrategy === s.strategy
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-accent"
                      )}
                    >
                      <span className="text-muted-foreground truncate max-w-[120px]">
                        {s.label}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums font-medium">
                          {formatTWD(s.price)}
                        </span>
                        <span className="tabular-nums text-xs text-red-500 w-[56px] text-right">
                          {s.distancePct.toFixed(2)}%
                        </span>
                        <span
                          className={cn(
                            "text-xs shrink-0",
                            appliedStrategy === s.strategy
                              ? "text-primary font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {appliedStrategy === s.strategy ? "已套用" : "套用"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}

              {grouped.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  無可用的停損建議
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
