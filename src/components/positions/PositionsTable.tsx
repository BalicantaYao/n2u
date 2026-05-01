"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatPct, cn, tradingViewUrl } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  Briefcase,
  AlertTriangle,
  ChevronDown,
  StickyNote,
  Activity,
  Plus,
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
    <TooltipProvider delayDuration={150}>
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
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.atrHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.dailyChangeHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help border-b border-dotted border-muted-foreground/40">
                          {t("positions.stopLossHeader")}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent align="end" className="px-3 py-2 text-[11px]">
                        <div className="font-medium">{t("positions.suggestedStopLossLabel")}</div>
                        <div className="text-muted-foreground">{t("positions.suggestedStopLossTip")}</div>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.stopLossPnLHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.costHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.valueHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.unrealizedHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.realizedHeader")}</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.returnHeader")}</th>
                  <th className="w-12 px-2 py-3" />
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
                                <a
                                  href={tradingViewUrl(pos.symbol, pos.market)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold tabular-nums hover:text-primary hover:underline"
                                  title="View on TradingView"
                                >
                                  {pos.symbol}
                                </a>
                                {pos.isStopLossAlert && (
                                  <span title={t("positions.stopLossAlert")}>
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
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
                          {pos.currency === "USD"
                            ? `${pos.totalShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${t("common.shares")}`
                            : pos.totalShares >= 1000
                              ? `${pos.totalShares / 1000} ${t("common.lots")}`
                              : `${pos.totalShares} ${t("common.shares")}`}
                        </td>

                        {/* Avg Cost */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {pos.avgCostPerShare.toFixed(2)}
                        </td>

                        {/* Current Price (hover to see 5MA / 10MA) */}
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const priceNode = (
                              <div className="tabular-nums">
                                {pos.currentPrice != null ? pos.currentPrice.toFixed(2) : "—"}
                              </div>
                            );
                            const hasMA = pos.ma5 != null || pos.ma10 != null;
                            if (!hasMA) return priceNode;
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block cursor-help border-b border-dotted border-muted-foreground/40">
                                    {priceNode}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent align="end" className="px-3 py-2">
                                  <div className="flex flex-col gap-1">
                                    {pos.ma5 != null && (
                                      <div
                                        className={cn(
                                          "text-[11px] tabular-nums flex items-center gap-1",
                                          pos.currentPrice != null && pos.currentPrice > pos.ma5
                                            ? "text-green-600 dark:text-green-400"
                                            : pos.currentPrice != null && pos.currentPrice < pos.ma5
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-muted-foreground"
                                        )}
                                      >
                                        <Activity className="h-3 w-3" />
                                        <span>{t("positions.ma5")}</span>
                                        <span className="ml-1">{pos.ma5.toFixed(2)}</span>
                                      </div>
                                    )}
                                    {pos.ma10 != null && (
                                      <div
                                        className={cn(
                                          "text-[11px] tabular-nums flex items-center gap-1",
                                          pos.currentPrice != null && pos.currentPrice > pos.ma10
                                            ? "text-green-600 dark:text-green-400"
                                            : pos.currentPrice != null && pos.currentPrice < pos.ma10
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-muted-foreground"
                                        )}
                                      >
                                        <Activity className="h-3 w-3" />
                                        <span>{t("positions.ma10")}</span>
                                        <span className="ml-1">{pos.ma10.toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </td>

                        {/* ATR(14) + volatility % (ATR / avg cost) */}
                        <td
                          className="px-4 py-3 text-right tabular-nums"
                          title={t("positions.atr14")}
                        >
                          {pos.atr14 != null ? (
                            <>
                              <div>{pos.atr14.toFixed(2)}</div>
                              {pos.avgCostPerShare > 0 && (
                                <div className="text-[11px] mt-0.5 text-muted-foreground">
                                  {formatPct(pos.atr14 / pos.avgCostPerShare)}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Today's Change */}
                        <td
                          className={cn(
                            "px-4 py-3 text-right tabular-nums",
                            pos.dailyChange == null
                              ? "text-muted-foreground"
                              : pos.dailyChange > 0
                              ? "text-green-600 dark:text-green-400"
                              : pos.dailyChange < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {pos.dailyChange != null ? (
                            <>
                              <div className="font-medium">
                                {formatCurrency(pos.dailyChange, pos.currency, true)}
                              </div>
                              {pos.dailyChangePct != null && (
                                <div className="text-[11px] mt-0.5">
                                  {formatPct(pos.dailyChangePct)}
                                </div>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Stop Loss + distance % */}
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(() => {
                            const distance =
                              pos.stopLoss != null && pos.currentPrice != null
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
                            const suggestedLine =
                              pos.suggestedStopLoss != null ? (
                                <div
                                  className="text-[11px] tabular-nums mt-0.5 text-muted-foreground"
                                  title={t("positions.suggestedStopLossTip")}
                                >
                                  {t("positions.suggestedStopLossLabel")} {pos.suggestedStopLoss.toFixed(2)}
                                  {pos.suggestedStopLossRefDate && (
                                    <span className="ml-1 opacity-80">
                                      ({pos.suggestedStopLossRefDate.slice(5)})
                                    </span>
                                  )}
                                </div>
                              ) : null;
                            const content =
                              pos.stopLoss == null ? (
                                <>
                                  <div className="tabular-nums text-muted-foreground">—</div>
                                  {suggestedLine}
                                </>
                              ) : (
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
                                  {suggestedLine}
                                </>
                              );

                            if (!pos.latestOpenBuyTradeId) return content;

                            return (
                              <Link
                                href={`/journal/${pos.latestOpenBuyTradeId}/edit`}
                                title={t("positions.editStopLoss")}
                                aria-label={t("positions.editStopLoss")}
                                className="block -mx-2 -my-1 px-2 py-1 rounded hover:bg-muted/60 transition-colors"
                              >
                                {content}
                              </Link>
                            );
                          })()}
                        </td>

                        {/* Hypothetical P&L @ Stop-Loss */}
                        <td
                          className={cn(
                            "px-4 py-3 text-right tabular-nums",
                            pos.pnlAtStopLoss == null
                              ? "text-muted-foreground"
                              : pos.pnlAtStopLoss >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {pos.pnlAtStopLoss != null ? (
                            <>
                              <div className="font-medium">
                                {formatCurrency(pos.pnlAtStopLoss, pos.currency, true)}
                              </div>
                              {pos.pnlAtStopLossPct != null && (
                                <div className="text-[11px] mt-0.5">
                                  {formatPct(pos.pnlAtStopLossPct)}
                                </div>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Total Cost */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(pos.totalCost, pos.currency)}
                        </td>

                        {/* Market Value */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {pos.marketValue != null ? formatCurrency(pos.marketValue, pos.currency) : "—"}
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
                            ? formatCurrency(pos.unrealizedPnL, pos.currency, true)
                            : "—"}
                        </td>

                        {/* Realized P&L (current holding period) */}
                        <td
                          className={cn(
                            "px-4 py-3 text-right tabular-nums font-medium",
                            !pos.realizedPnL
                              ? "text-muted-foreground"
                              : pos.realizedPnL > 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {formatCurrency(pos.realizedPnL ?? 0, pos.currency, true)}
                        </td>

                        {/* Return % */}
                        <td
                          className={cn(
                            "px-4 py-3 text-right tabular-nums font-medium",
                            pos.totalPnLPct == null
                              ? "text-muted-foreground"
                              : pos.totalPnLPct >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {pos.totalPnLPct != null
                            ? formatPct(pos.totalPnLPct)
                            : "—"}
                        </td>

                        {/* Add Trade Record */}
                        <td
                          className="px-2 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                          >
                            <Link
                              href={{
                                pathname: "/journal/new",
                                query: {
                                  symbol: pos.symbol,
                                  ...(pos.symbolName
                                    ? { symbolName: pos.symbolName }
                                    : {}),
                                  market: pos.market,
                                  ...(pos.isETF ? { isETF: "1" } : {}),
                                },
                              }}
                              aria-label={t("positions.addTradeRecord")}
                              title={t("positions.addTradeRecord")}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded notes sub-row */}
                      {isExp && hasNotes && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={15} className="px-8 py-3">
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
    </TooltipProvider>
  );
}
