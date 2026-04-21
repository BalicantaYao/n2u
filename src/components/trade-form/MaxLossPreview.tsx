"use client";

import { useState, useEffect, useRef } from "react";
import { calculateFees } from "@/lib/fees";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import { marketToCurrency } from "@/types/taiwan";
import type { Market, Side } from "@/types/taiwan";

interface MaxLossPreviewProps {
  symbol: string;
  market: Market;
  price: number;
  shares: number;
  stopLoss: number;
  side: Side;
  isETF: boolean;
  commission?: number;
  /** 編輯既有交易時傳入，API 會排除該交易的 lots，避免把自己當成既有部位重複計算 */
  editingTradeId?: string;
}

interface ExistingPosition {
  totalShares: number;
  totalCost: number;
  avgCostPerShare: number;
}

export function MaxLossPreview({
  symbol,
  market,
  price,
  shares,
  stopLoss,
  side,
  isETF,
  commission,
  editingTradeId,
}: MaxLossPreviewProps) {
  const { t } = useT();
  const currency = marketToCurrency(market);
  const [position, setPosition] = useState<ExistingPosition | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canShow =
    side === "BUY" && price > 0 && stopLoss > 0 && shares > 0 && stopLoss < price;

  // Fetch existing position when symbol changes
  useEffect(() => {
    if (!symbol || !canShow) {
      setPosition(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams({ symbol });
      if (editingTradeId) params.set("excludeTradeId", editingTradeId);

      fetch(`/api/positions/by-symbol?${params}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data: ExistingPosition | null) => {
          setPosition(data);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setPosition(null);
        });
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [symbol, canShow, editingTradeId]);

  if (!canShow) {
    return null;
  }

  // -- Calculation --

  // New trade buy cost (incl. commission)
  const newBuyFees = calculateFees(market, {
    price,
    shares,
    side: "BUY",
    isETF,
    commission,
  });
  const newBuyCost = newBuyFees.netAmount;

  // New trade sell proceeds at stop loss
  const newSellFees = calculateFees(market, {
    price: stopLoss,
    shares,
    side: "SELL",
    isETF,
    commission,
  });
  const newTradeLoss = newBuyCost - newSellFees.netAmount;

  const hasPosition = position != null && position.totalShares > 0;

  let existingLoss = 0;
  let totalMaxLoss = newTradeLoss;
  let totalCost = newBuyCost;

  if (hasPosition) {
    // Existing position sell proceeds at stop loss
    const existingSellFees = calculateFees(market, {
      price: stopLoss,
      shares: position.totalShares,
      side: "SELL",
      isETF,
      commission,
    });
    existingLoss = position.totalCost - existingSellFees.netAmount;

    totalCost = position.totalCost + newBuyCost;
    totalMaxLoss = newTradeLoss + existingLoss;
  }

  const maxLossPct = totalCost > 0 ? (totalMaxLoss / totalCost) * 100 : 0;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20 p-4 space-y-2">
      <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        {t("maxLoss.title")}
      </p>

      {/* Existing position banner */}
      {hasPosition && (
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 mb-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {t("maxLoss.existingPosition", {
              shares: position.totalShares.toLocaleString(),
              avgCost: formatCurrency(position.avgCostPerShare, currency),
            })}
          </span>
        </div>
      )}

      {/* New trade loss */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t("maxLoss.newTradeLoss")}</span>
        <span
          className={cn(
            "tabular-nums font-medium",
            newTradeLoss > 0
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          )}
        >
          -{formatCurrency(Math.abs(newTradeLoss), currency)}
        </span>
      </div>

      {/* Existing position loss */}
      {hasPosition && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {t("maxLoss.existingLoss")}
          </span>
          <span
            className={cn(
              "tabular-nums font-medium",
              existingLoss > 0
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            )}
          >
            {existingLoss > 0 ? "-" : "+"}
            {formatCurrency(Math.abs(existingLoss), currency)}
          </span>
        </div>
      )}

      {/* Total max loss */}
      <div
        className={cn(
          "flex justify-between text-sm font-bold",
          hasPosition && "border-t pt-2 mt-2"
        )}
      >
        <span>{t("maxLoss.totalMaxLoss")}</span>
        <span
          className={cn(
            "tabular-nums",
            totalMaxLoss > 0
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          )}
        >
          {totalMaxLoss > 0 ? "-" : "+"}
          {formatCurrency(Math.abs(totalMaxLoss), currency)} ({totalMaxLoss > 0 ? "-" : "+"}
          {Math.abs(maxLossPct).toFixed(2)}%)
        </span>
      </div>

      {/* Fee notice */}
      <p className="text-xs text-muted-foreground pt-1">
        {t("maxLoss.includeFees")}
      </p>
    </div>
  );
}
