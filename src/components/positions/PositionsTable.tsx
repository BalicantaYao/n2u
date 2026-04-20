"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTWD, formatPct, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  Briefcase,
  AlertTriangle,
  Target,
  ChevronDown,
  StickyNote,
  Activity,
} from "lucide-react";
import type { Position } from "@/types/trade";

interface PositionsTableProps {
  positions: Position[];
}

export function PositionsTable({ positions }: PositionsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { t } = useT();

  function toggle(symbol: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{t("positions.positionDetail")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Briefcase className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{t("positions.noPositions")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-6 px-1 py-3" />
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("positions.stockHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.sharesHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.avgCost")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.currentPrice")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.stopLossHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.costHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.valueHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.unrealizedHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.returnHeader")}</th>
                </tr>
              </thead>
                {positions.map((pos) => {
                  const pnlPositive = (pos.unrealizedPnL ?? 0) >= 0;
                  const hasNotes = pos.notes.length > 0;
                  const isExp = expanded.has(pos.symbol);
                  return (
                    <tbody key={pos.symbol}>
                      <tr
                        className={cn(
                          "border-b hover:bg-muted/30 transition-colors",
                          hasNotes && "cursor-pointer",
                          isExp && "bg-muted/20"
                        )}
                        onClick={hasNotes ? () => toggle(pos.symbol) : undefined}
                      >
                        {/* Expand toggle */}
                        <td className="px-1 py-3 text-center">
                          {hasNotes && (
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform mx-auto",
                                isExp && "rotate-180"
                              )}
                            />
                          )}
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold tabular-nums">{pos.symbol}</span>
                                {pos.isStopLossAlert && (
                                  <span title={t("positions.stopLossAlert")}>
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                  </span>
                                )}
                                {pos.isTakeProfitAlert && (
                                  <span title={t("positions.takeProfitAlert")}>
                                    <Target className="h-3.5 w-3.5 text-green-500" />
                                  </span>
                                )}
                                {hasNotes && (
                                  <StickyNote className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              {pos.symbolName && (
                                <div className="text-xs text-muted-foreground">{pos.symbolName}</div>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                            >
                              {pos.market}
                            </Badge>
                          </div>
                        </td>

                        {/* Shares */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {pos.totalShares >= 1000
                            ? `${pos.totalShares / 1000} ${t("common.lots")}`
                            : `${pos.totalShares} ${t("common.shares")}`}
                        </td>

                        {/* Avg Cost */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {pos.avgCostPerShare.toFixed(2)}
                        </td>

                        {/* Current Price + Take-profit */}
                        <td className="px-4 py-3 text-right">
                          <div className="tabular-nums">
                            {pos.currentPrice != null ? pos.currentPrice.toFixed(2) : "—"}
                          </div>
                          {pos.takeProfit != null && (
                            <div className="flex items-center justify-end gap-2 mt-0.5">
                              <span
                                className={cn(
                                  "text-[11px] tabular-nums flex items-center gap-0.5",
                                  pos.isTakeProfitAlert
                                    ? "text-green-600 dark:text-green-400 font-medium"
                                    : "text-muted-foreground"
                                )}
                                title={t("positions.takeProfitPrice")}
                              >
                                <Target className="h-3 w-3" />
                                {pos.takeProfit.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {(pos.ma5 != null || pos.ma10 != null) && (
                            <div className="flex items-center justify-end gap-2 mt-0.5">
                              {pos.ma5 != null && (
                                <span
                                  className={cn(
                                    "text-[11px] tabular-nums flex items-center gap-0.5",
                                    pos.currentPrice != null && pos.currentPrice > pos.ma5
                                      ? "text-green-600 dark:text-green-400"
                                      : pos.currentPrice != null && pos.currentPrice < pos.ma5
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-muted-foreground"
                                  )}
                                  title={t("positions.ma5")}
                                >
                                  <Activity className="h-3 w-3" />
                                  5MA {pos.ma5.toFixed(2)}
                                </span>
                              )}
                              {pos.ma10 != null && (
                                <span
                                  className={cn(
                                    "text-[11px] tabular-nums flex items-center gap-0.5",
                                    pos.currentPrice != null && pos.currentPrice > pos.ma10
                                      ? "text-green-600 dark:text-green-400"
                                      : pos.currentPrice != null && pos.currentPrice < pos.ma10
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-muted-foreground"
                                  )}
                                  title={t("positions.ma10")}
                                >
                                  <Activity className="h-3 w-3" />
                                  10MA {pos.ma10.toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Stop Loss + distance % */}
                        <td className="px-4 py-3 text-right">
                          {pos.stopLoss == null ? (
                            <div className="tabular-nums text-muted-foreground">—</div>
                          ) : (
                            (() => {
                              const distance =
                                pos.currentPrice != null
                                  ? (pos.currentPrice - pos.stopLoss) / pos.stopLoss
                                  : null;
                              const priceColor = pos.isStopLossAlert
                                ? "text-red-600 dark:text-red-400 font-medium"
                                : distance != null && distance < 0.03
                                ? "text-amber-600 dark:text-amber-400"
                                : "";
                              const distanceColor = pos.isStopLossAlert
                                ? "text-red-600 dark:text-red-400 font-medium"
                                : distance != null && distance < 0.03
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground";
                              return (
                                <>
                                  <div
                                    className={cn(
                                      "tabular-nums flex items-center justify-end gap-1",
                                      priceColor
                                    )}
                                  >
                                    {pos.isStopLossAlert && (
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                    )}
                                    {pos.stopLoss.toFixed(2)}
                                  </div>
                                  <div
                                    className={cn(
                                      "text-[11px] tabular-nums mt-0.5",
                                      distanceColor
                                    )}
                                  >
                                    {distance != null ? formatPct(distance) : "—"}
                                  </div>
                                </>
                              );
                            })()
                          )}
                        </td>

                        {/* Total Cost */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatTWD(pos.totalCost)}
                        </td>

                        {/* Market Value */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {pos.marketValue != null ? formatTWD(pos.marketValue) : "—"}
                        </td>

                        {/* Unrealized P&L */}
                        <td
                          className={cn(
                            "px-4 py-3 text-right tabular-nums font-medium",
                            pos.unrealizedPnL == null
                              ? "text-muted-foreground"
                              : pnlPositive
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {pos.unrealizedPnL != null
                            ? formatTWD(pos.unrealizedPnL, true)
                            : "—"}
                        </td>

                        {/* Return % */}
                        <td
                          className={cn(
                            "px-4 py-3 text-right tabular-nums font-medium",
                            pos.unrealizedPnLPct == null
                              ? "text-muted-foreground"
                              : pnlPositive
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {pos.unrealizedPnLPct != null
                            ? formatPct(pos.unrealizedPnLPct)
                            : "—"}
                        </td>
                      </tr>

                      {/* Expanded notes sub-row */}
                      {isExp && hasNotes && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={10} className="px-8 py-3">
                            <div className="text-xs space-y-1.5">
                              <p className="text-muted-foreground font-medium">{t("common.notes")}</p>
                              {pos.notes.map((note, i) => (
                                <p
                                  key={i}
                                  className="whitespace-pre-wrap text-muted-foreground pl-2 border-l-2 border-border"
                                >
                                  {note}
                                </p>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
