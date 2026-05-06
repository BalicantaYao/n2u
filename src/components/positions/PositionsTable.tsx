"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Check,
  X,
  Loader2,
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
                  <th className="text-left px-2 md:px-4 py-3 font-medium text-muted-foreground">{t("positions.stockHeader")}</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.sharesHeader")}</th>
                  <th className="text-right px-2 md:px-4 py-3 font-medium text-muted-foreground">{t("positions.avgCost")}</th>
                  <th className="text-right px-2 md:px-4 py-3 font-medium text-muted-foreground">{t("positions.currentPrice")}</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.atrHeader")}</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.dailyChangeHeader")}</th>
                  <th className="text-right px-2 md:px-4 py-3 font-medium text-muted-foreground">
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
                  <th className="hidden md:table-cell text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.stopLossPnLHeader")}</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.costHeader")}</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.valueHeader")}</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.unrealizedHeader")}</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.realizedHeader")}</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 font-medium text-muted-foreground">{t("positions.returnHeader")}</th>
                  <th className="hidden md:table-cell w-12 px-2 py-3" />
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
                          "border-b hover:bg-muted/30 transition-colors cursor-pointer",
                          !hasNotes && "md:cursor-default",
                          isExp && "bg-muted/20"
                        )}
                        onClick={() => toggle(pos.symbol)}
                      >
                        {/* Expand toggle: always shown on mobile, only when notes on desktop */}
                        <td className="px-1 py-3 text-center">
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform mx-auto",
                              !hasNotes && "md:hidden",
                              isExp && "rotate-180"
                            )}
                          />
                        </td>

                        {/* Stock */}
                        <td className="px-2 md:px-4 py-3">
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
                        <td className="hidden md:table-cell px-4 py-3 text-right tabular-nums">
                          {pos.currency === "USD"
                            ? `${pos.totalShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${t("common.shares")}`
                            : pos.totalShares >= 1000
                              ? `${pos.totalShares / 1000} ${t("common.lots")}`
                              : `${pos.totalShares} ${t("common.shares")}`}
                        </td>

                        {/* Avg Cost */}
                        <td className="px-2 md:px-4 py-3 text-right tabular-nums">
                          {pos.avgCostPerShare.toFixed(2)}
                        </td>

                        {/* Current Price (hover to see 5MA / 10MA) */}
                        <td className="px-2 md:px-4 py-3 text-right">
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
                          className="hidden md:table-cell px-4 py-3 text-right tabular-nums"
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
                            "hidden md:table-cell px-4 py-3 text-right tabular-nums",
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
                          className="px-2 md:px-4 py-3 text-right"
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
                            const isSuggestionCloseToStopLoss =
                              pos.suggestedStopLoss != null &&
                              pos.stopLoss != null &&
                              pos.stopLoss !== 0 &&
                              Math.abs(pos.suggestedStopLoss - pos.stopLoss) /
                                Math.abs(pos.stopLoss) <=
                                0.01;
                            const suggestedLine =
                              pos.suggestedStopLoss != null &&
                              !isSuggestionCloseToStopLoss ? (
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
                              <StopLossEditor
                                tradeId={pos.latestOpenBuyTradeId}
                                stopLoss={pos.stopLoss}
                                title={t("positions.editStopLoss")}
                              >
                                {content}
                              </StopLossEditor>
                            );
                          })()}
                        </td>

                        {/* Hypothetical P&L @ Stop-Loss */}
                        <td
                          className={cn(
                            "hidden md:table-cell px-4 py-3 text-right tabular-nums",
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
                        <td className="hidden md:table-cell px-4 py-3 text-right tabular-nums">
                          {formatCurrency(pos.totalCost, pos.currency)}
                        </td>

                        {/* Market Value */}
                        <td className="hidden md:table-cell px-4 py-3 text-right tabular-nums">
                          {pos.marketValue != null ? formatCurrency(pos.marketValue, pos.currency) : "—"}
                        </td>

                        {/* Unrealized P&L */}
                        <td
                          className={cn(
                            "hidden md:table-cell px-4 py-3 text-right tabular-nums font-medium",
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
                            "hidden md:table-cell px-4 py-3 text-right tabular-nums font-medium",
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
                            "hidden md:table-cell px-4 py-3 text-right tabular-nums font-medium",
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
                          className="hidden md:table-cell px-2 py-3 text-center"
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

                      {/* Expanded sub-row: hidden mobile fields + notes */}
                      {isExp && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={15} className="px-4 md:px-8 py-3">
                            {/* Mobile-only details (the columns hidden in the row above) */}
                            <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                              <DetailItem
                                label={t("positions.sharesHeader")}
                                value={
                                  pos.currency === "USD"
                                    ? `${pos.totalShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${t("common.shares")}`
                                    : pos.totalShares >= 1000
                                      ? `${pos.totalShares / 1000} ${t("common.lots")}`
                                      : `${pos.totalShares} ${t("common.shares")}`
                                }
                              />
                              <DetailItem
                                label={t("positions.dailyChangeHeader")}
                                value={
                                  pos.dailyChange != null
                                    ? `${formatCurrency(pos.dailyChange, pos.currency, true)}${pos.dailyChangePct != null ? ` (${formatPct(pos.dailyChangePct)})` : ""}`
                                    : "—"
                                }
                                valueClassName={
                                  pos.dailyChange == null
                                    ? "text-muted-foreground"
                                    : pos.dailyChange > 0
                                      ? "text-green-600 dark:text-green-400"
                                      : pos.dailyChange < 0
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-muted-foreground"
                                }
                              />
                              <DetailItem
                                label={t("positions.atrHeader")}
                                value={
                                  pos.atr14 != null
                                    ? `${pos.atr14.toFixed(2)}${pos.avgCostPerShare > 0 ? ` (${formatPct(pos.atr14 / pos.avgCostPerShare)})` : ""}`
                                    : "—"
                                }
                              />
                              <DetailItem
                                label={t("positions.stopLossPnLHeader")}
                                value={
                                  pos.pnlAtStopLoss != null
                                    ? `${formatCurrency(pos.pnlAtStopLoss, pos.currency, true)}${pos.pnlAtStopLossPct != null ? ` (${formatPct(pos.pnlAtStopLossPct)})` : ""}`
                                    : "—"
                                }
                                valueClassName={
                                  pos.pnlAtStopLoss == null
                                    ? "text-muted-foreground"
                                    : pos.pnlAtStopLoss >= 0
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                }
                              />
                              <DetailItem
                                label={t("positions.costHeader")}
                                value={formatCurrency(pos.totalCost, pos.currency)}
                              />
                              <DetailItem
                                label={t("positions.valueHeader")}
                                value={pos.marketValue != null ? formatCurrency(pos.marketValue, pos.currency) : "—"}
                              />
                              <DetailItem
                                label={t("positions.unrealizedHeader")}
                                value={
                                  pos.unrealizedPnL != null
                                    ? formatCurrency(pos.unrealizedPnL, pos.currency, true)
                                    : "—"
                                }
                                valueClassName={
                                  pos.unrealizedPnL == null
                                    ? "text-muted-foreground"
                                    : pnlPositive
                                      ? "text-green-600 dark:text-green-400 font-medium"
                                      : "text-red-600 dark:text-red-400 font-medium"
                                }
                              />
                              <DetailItem
                                label={t("positions.realizedHeader")}
                                value={formatCurrency(pos.realizedPnL ?? 0, pos.currency, true)}
                                valueClassName={
                                  !pos.realizedPnL
                                    ? "text-muted-foreground"
                                    : pos.realizedPnL > 0
                                      ? "text-green-600 dark:text-green-400 font-medium"
                                      : "text-red-600 dark:text-red-400 font-medium"
                                }
                              />
                              <DetailItem
                                label={t("positions.returnHeader")}
                                value={pos.totalPnLPct != null ? formatPct(pos.totalPnLPct) : "—"}
                                valueClassName={
                                  pos.totalPnLPct == null
                                    ? "text-muted-foreground"
                                    : pos.totalPnLPct >= 0
                                      ? "text-green-600 dark:text-green-400 font-medium"
                                      : "text-red-600 dark:text-red-400 font-medium"
                                }
                              />
                              <div className="col-span-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-full"
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
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    {t("positions.addTradeRecord")}
                                  </Link>
                                </Button>
                              </div>
                            </div>

                            {hasNotes && (
                              <div className={cn("text-xs space-y-1.5", "md:mt-0 mt-3")}>
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
                            )}
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

function DetailItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums text-right", valueClassName)}>{value}</span>
    </div>
  );
}

function StopLossEditor({
  tradeId,
  stopLoss,
  title,
  children,
}: {
  tradeId: string;
  stopLoss?: number;
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useT();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      setValue(stopLoss != null ? String(stopLoss) : "");
      setError(null);
      // Focus and select on next tick so the input is ready
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing, stopLoss]);

  function close() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    const trimmed = value.trim();
    let payload: number | null;
    if (trimmed === "") {
      payload = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {
        setError(t("positions.saveFailed"));
        return;
      }
      payload = n;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopLoss: payload }),
      });
      if (!res.ok) {
        setError(t("positions.saveFailed"));
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError(t("positions.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Input
          ref={inputRef}
          type="number"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          disabled={saving}
          aria-label={t("positions.stopLossPrice")}
          className={cn(
            "h-7 w-20 px-1.5 text-right tabular-nums text-sm",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => void save()}
          disabled={saving}
          aria-label={t("common.save")}
          title={t("common.save")}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={close}
          disabled={saving}
          aria-label={t("common.cancel")}
          title={t("common.cancel")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={() => setEditing(true)}
      className="block w-full text-right -mx-2 -my-1 px-2 py-1 rounded hover:bg-muted/60 transition-colors"
    >
      {children}
    </button>
  );
}
