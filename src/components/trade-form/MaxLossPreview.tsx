"use client";

import { useState, useEffect, useRef } from "react";
import { calculateFees } from "@/lib/taiwan-fees";
import { formatTWD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import type { Side } from "@/types/taiwan";

interface MaxLossPreviewProps {
  symbol: string;
  price: number;
  shares: number;
  stopLoss: number;
  side: Side;
  isETF: boolean;
}

interface ExistingPosition {
  totalShares: number;
  totalCost: number;
  avgCostPerShare: number;
  avgPricePerShare: number;
}

export function MaxLossPreview({
  symbol,
  price,
  shares,
  stopLoss,
  side,
  isETF,
}: MaxLossPreviewProps) {
  const { t } = useT();
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

      fetch(`/api/positions/by-symbol?symbol=${encodeURIComponent(symbol)}`, {
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
  }, [symbol, canShow]);

  if (!canShow) {
    return null;
  }

  // -- Calculation --

  // New trade buy cost (incl. commission)
  const newBuyFees = calculateFees({ price, shares, side: "BUY", isETF });
  const newBuyCost = newBuyFees.netAmount;

  // New trade sell proceeds at stop loss
  const newSellFees = calculateFees({
    price: stopLoss,
    shares,
    side: "SELL",
    isETF,
  });
  const newTradeLoss = newBuyCost - newSellFees.netAmount;

  const hasPosition = position != null && position.totalShares > 0;

  let existingLoss = 0;
  let totalMaxLoss = newTradeLoss;
  let totalCost = newBuyCost;

  if (hasPosition) {
    // Existing position sell proceeds at stop loss
    const existingSellFees = calculateFees({
      price: stopLoss,
      shares: position.totalShares,
      side: "SELL",
      isETF,
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
              avgCost: position.avgPricePerShare.toFixed(2),
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
          -{formatTWD(Math.abs(newTradeLoss))}
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
            {formatTWD(Math.abs(existingLoss))}
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
        <span className="tabular-nums text-red-600 dark:text-red-400">
          -{formatTWD(Math.abs(totalMaxLoss))} ({maxLossPct.toFixed(2)}%)
        </span>
      </div>

      {/* Fee notice */}
      <p className="text-xs text-muted-foreground pt-1">
        {t("maxLoss.includeFees")}
      </p>
    </div>
  );
}
