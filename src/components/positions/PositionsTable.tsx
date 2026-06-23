"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatPct, formatDate, cn, tradingViewUrl } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useColumnOrder } from "@/hooks/useColumnOrder";

// Removed always-hidden columns (shares, realizedPnL) from main column array.
// They are shown in the expanded detail row instead.
const POSITIONS_TABLE_DEFAULT_WIDTHS = [32, 160, 90, 90, 80, 100, 100, 110, 110, 110, 110, 90, 56];

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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BellRing,
} from "lucide-react";
import type { Position } from "@/types/trade";

const POSITIONS_COL_IDS = [
  "expand", "symbol", "avgCost", "currentPrice", "holdingDays",
  "dailyChange", "stopLoss", "pnlAtStopLoss", "totalCost",
  "marketValue", "unrealizedPnL", "totalPnLPct", "actions",
] as const;
type PosColId = typeof POSITIONS_COL_IDS[number];
const POSITIONS_FIXED_COLS = new Set<string>(["expand", "actions"]);

interface PositionsTableProps {
  positions: Position[];
  titleKey?: string;
}

type SortKey =
  | "symbol"
  | "totalShares"
  | "avgCostPerShare"
  | "currentPrice"
  | "holdingDays"
  | "dailyChangePct"
  | "stopLoss"
  | "pnlAtStopLoss"
  | "totalCost"
  | "marketValue"
  | "unrealizedPnL"
  | "realizedPnL"
  | "totalPnLPct";

type SortDir = "asc" | "desc";

function sortValue(pos: Position, key: SortKey): number | string | null | undefined {
  switch (key) {
    case "symbol": return pos.symbol;
    case "totalShares": return pos.totalShares;
    case "avgCostPerShare": return pos.avgCostPerShare;
    case "currentPrice": return pos.currentPrice;
    case "holdingDays": return pos.holdingDays;
    case "dailyChangePct": return pos.dailyChangePct;
    case "stopLoss": return pos.stopLoss;
    case "pnlAtStopLoss": return pos.pnlAtStopLoss;
    case "totalCost": return pos.totalCost;
    case "marketValue": return pos.marketValue;
    case "unrealizedPnL": return pos.unrealizedPnL;
    case "realizedPnL": return pos.realizedPnL ?? 0;
    case "totalPnLPct": return pos.totalPnLPct;
  }
}

export function PositionsTable({
  positions,
  titleKey = "positions.positionDetail",
}: PositionsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const { t } = useT();
  const { widths, startResize } = useColumnResize("positions-table-col-widths", POSITIONS_TABLE_DEFAULT_WIDTHS);
  const { order, moveColumn } = useColumnOrder("positions-table-col-order", [...POSITIONS_COL_IDS]);

  const dragColRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function toggle(symbol: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "desc" };
      if (prev.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }

  const sortedPositions = useMemo(() => {
    if (!sort) return positions;
    const arr = [...positions];
    arr.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const aNull = av == null;
      const bNull = bv == null;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      let cmp: number;
      if (typeof av === "string" || typeof bv === "string") {
        cmp = String(av).localeCompare(String(bv));
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [positions, sort]);

  function SortLabel({ sortKey, label }: { sortKey: SortKey; label: string }) {
    const active = sort?.key === sortKey;
    return (
      <button
        type="button"
        onClick={() => toggleSort(sortKey)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground transition-colors", active && "text-foreground")}
      >
        {label}
        {active ? (
          sort!.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    );
  }

  function handleDragStart(posIdx: number, colId: string) {
    if (POSITIONS_FIXED_COLS.has(colId)) return;
    dragColRef.current = posIdx;
  }

  function handleDragOver(e: React.DragEvent, posIdx: number, colId: string) {
    if (POSITIONS_FIXED_COLS.has(colId)) return;
    if (dragColRef.current === null) return;
    e.preventDefault();
    setDragOverIdx(posIdx);
  }

  function handleDrop(posIdx: number, colId: string) {
    if (POSITIONS_FIXED_COLS.has(colId)) return;
    if (dragColRef.current !== null && dragColRef.current !== posIdx) {
      moveColumn(dragColRef.current, posIdx);
    }
    dragColRef.current = null;
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    dragColRef.current = null;
    setDragOverIdx(null);
  }

  function renderHeaderCell(colId: PosColId, posIdx: number) {
    const isFixed = POSITIONS_FIXED_COLS.has(colId);
    const isDragTarget = dragOverIdx === posIdx && dragColRef.current !== posIdx && !isFixed;
    const resizeHandle = posIdx < order.length - 1 ? (
      <div
        className="absolute inset-y-0 right-0 w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10"
        onMouseDown={startResize(posIdx)}
        draggable={false}
      />
    ) : null;

    const commonThProps = {
      key: colId,
      style: { minWidth: widths[posIdx] },
      draggable: !isFixed,
      onDragStart: () => handleDragStart(posIdx, colId),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, posIdx, colId),
      onDrop: () => handleDrop(posIdx, colId),
      onDragEnd: handleDragEnd,
    };

    const thCls = (extra = "") =>
      cn(
        "px-2 md:px-4 py-3 font-medium text-muted-foreground relative select-none",
        !isFixed && "cursor-grab active:cursor-grabbing",
        isDragTarget && "border-l-2 border-primary bg-primary/5",
        extra
      );

    switch (colId) {
      case "expand":
        return (
          <th {...commonThProps} className={cn("px-1 py-3 relative select-none", isDragTarget && "border-l-2 border-primary bg-primary/5")}>
            {resizeHandle}
          </th>
        );
      case "symbol":
        return (
          <th {...commonThProps} className={thCls("text-left")}>
            <SortLabel sortKey="symbol" label={t("positions.stockHeader")} />
            {resizeHandle}
          </th>
        );
      case "avgCost":
        return (
          <th {...commonThProps} className={thCls("text-right")}>
            <SortLabel sortKey="avgCostPerShare" label={t("positions.avgCost")} />
            {resizeHandle}
          </th>
        );
      case "currentPrice":
        return (
          <th {...commonThProps} className={thCls("text-right")}>
            <SortLabel sortKey="currentPrice" label={t("positions.currentPrice")} />
            {resizeHandle}
          </th>
        );
      case "holdingDays":
        return (
          <th {...commonThProps} className={thCls("hidden md:table-cell text-right")}>
            <SortLabel sortKey="holdingDays" label={t("positions.holdingDaysHeader")} />
            {resizeHandle}
          </th>
        );
      case "dailyChange":
        return (
          <th {...commonThProps} className={thCls("hidden md:table-cell text-right")}>
            <SortLabel sortKey="dailyChangePct" label={t("positions.dailyChangeHeader")} />
            {resizeHandle}
          </th>
        );
      case "stopLoss":
        return (
          <th {...commonThProps} className={thCls("text-right")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleSort("stopLoss")}
                  className={cn(
                    "inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-foreground/40 hover:text-foreground transition-colors",
                    sort?.key === "stopLoss" && "text-foreground"
                  )}
                >
                  {t("positions.stopLossHeader")}
                  {sort?.key === "stopLoss" ? (
                    sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent align="end" className="px-3 py-2 text-[11px]">
                <div className="font-medium">{t("positions.suggestedStopLossLabel")}</div>
                <div className="text-muted-foreground">{t("positions.suggestedStopLossTip")}</div>
              </TooltipContent>
            </Tooltip>
            {resizeHandle}
          </th>
        );
      case "pnlAtStopLoss":
        return (
          <th {...commonThProps} className={thCls("hidden md:table-cell text-right")}>
            <SortLabel sortKey="pnlAtStopLoss" label={t("positions.stopLossPnLHeader")} />
            {resizeHandle}
          </th>
        );
      case "totalCost":
        return (
          <th {...commonThProps} className={thCls("hidden md:table-cell text-right")}>
            <SortLabel sortKey="totalCost" label={t("positions.costHeader")} />
            {resizeHandle}
          </th>
        );
      case "marketValue":
        return (
          <th {...commonThProps} className={thCls("hidden md:table-cell text-right")}>
            <SortLabel sortKey="marketValue" label={t("positions.valueHeader")} />
            {resizeHandle}
          </th>
        );
      case "unrealizedPnL":
        return (
          <th {...commonThProps} className={thCls("hidden md:table-cell text-right")}>
            <SortLabel sortKey="unrealizedPnL" label={t("positions.unrealizedHeader")} />
            {resizeHandle}
          </th>
        );
      case "totalPnLPct":
        return (
          <th {...commonThProps} className={thCls("hidden md:table-cell text-right")}>
            <SortLabel sortKey="totalPnLPct" label={t("positions.returnHeader")} />
            {resizeHandle}
          </th>
        );
      case "actions":
        return (
          <th {...commonThProps} className={cn("hidden md:table-cell px-2 py-3 relative select-none", isDragTarget && "border-l-2 border-primary bg-primary/5")} />
        );
    }
  }

  function renderBodyCell(colId: PosColId, pos: Position) {
    const pnlPositive = (pos.unrealizedPnL ?? 0) >= 0;

    switch (colId) {
      case "expand":
        return (
          <td key={colId} className="px-1 py-3 text-center">
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform mx-auto", expanded.has(pos.symbol) && "rotate-180")} />
          </td>
        );
      case "symbol":
        return (
          <td key={colId} className="px-2 md:px-4 py-3">
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
                  {pos.currency === "USD" && pos.needsStopLossReview && (
                    <span title={t("positions.stopLossReviewBadge", { days: pos.daysSinceStopLossUpdate ?? 0 })}>
                      <BellRing className="h-3.5 w-3.5 text-amber-500" />
                    </span>
                  )}
                  {pos.notes.length > 0 && <StickyNote className="h-3 w-3 text-muted-foreground" />}
                </div>
                {pos.symbolName && <div className="text-xs text-muted-foreground">{pos.symbolName}</div>}
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">{pos.market}</Badge>
            </div>
          </td>
        );
      case "avgCost":
        return (
          <td key={colId} className="px-2 md:px-4 py-3 text-right tabular-nums">
            {pos.avgCostPerShare.toFixed(2)}
          </td>
        );
      case "currentPrice":
        return (
          <td key={colId} className="px-2 md:px-4 py-3 text-right">
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
                        <div className={cn(
                          "text-[11px] tabular-nums flex items-center gap-1",
                          pos.currentPrice != null && pos.currentPrice > pos.ma5 ? "text-green-600 dark:text-green-400"
                            : pos.currentPrice != null && pos.currentPrice < pos.ma5 ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        )}>
                          <Activity className="h-3 w-3" />
                          <span>{t("positions.ma5")}</span>
                          <span className="ml-1">{pos.ma5.toFixed(2)}</span>
                        </div>
                      )}
                      {pos.ma10 != null && (
                        <div className={cn(
                          "text-[11px] tabular-nums flex items-center gap-1",
                          pos.currentPrice != null && pos.currentPrice > pos.ma10 ? "text-green-600 dark:text-green-400"
                            : pos.currentPrice != null && pos.currentPrice < pos.ma10 ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        )}>
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
        );
      case "holdingDays":
        return (
          <td key={colId} className="hidden md:table-cell px-4 py-3 text-right tabular-nums">
            {pos.holdingDays != null ? (
              <span>{pos.holdingDays}<span className="ml-1 text-[11px] text-muted-foreground">{t("positions.daysUnit")}</span></span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </td>
        );
      case "dailyChange":
        return (
          <td key={colId} className={cn(
            "hidden md:table-cell px-4 py-3 text-right tabular-nums",
            pos.dailyChange == null ? "text-muted-foreground"
              : pos.dailyChange > 0 ? "text-green-600 dark:text-green-400"
              : pos.dailyChange < 0 ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          )}>
            {pos.dailyChange != null ? (
              <>
                <div className="font-medium">{formatCurrency(pos.dailyChange, pos.currency, true)}</div>
                {pos.dailyChangePct != null && <div className="text-[11px] mt-0.5">{formatPct(pos.dailyChangePct)}</div>}
              </>
            ) : "—"}
          </td>
        );
      case "stopLoss":
        return (
          <td key={colId} className="px-2 md:px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const distance =
                pos.stopLoss != null && pos.currentPrice != null
                  ? (pos.currentPrice - pos.stopLoss) / pos.stopLoss
                  : null;
              const priceColor = pos.isStopLossAlert
                ? "text-red-600 dark:text-red-400 font-medium"
                : distance != null && distance < 0.03 ? "text-amber-600 dark:text-amber-400" : "";
              const distanceColor = pos.isStopLossAlert
                ? "text-red-600 dark:text-red-400 font-medium"
                : distance != null && distance < 0.03 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
              const isSuggestionClose =
                pos.suggestedStopLoss != null &&
                pos.stopLoss != null &&
                pos.stopLoss !== 0 &&
                Math.abs(pos.suggestedStopLoss - pos.stopLoss) / Math.abs(pos.stopLoss) <= 0.01;
              const suggestedLine =
                pos.suggestedStopLoss != null && !isSuggestionClose ? (
                  <div className="text-[11px] tabular-nums mt-0.5 text-muted-foreground" title={t("positions.suggestedStopLossTip")}>
                    {t("positions.suggestedStopLossLabel")} {pos.suggestedStopLoss.toFixed(2)}
                    {pos.suggestedStopLossRefDate && (
                      <span className="ml-1 opacity-80">({pos.suggestedStopLossRefDate.slice(5)})</span>
                    )}
                  </div>
                ) : null;
              const content =
                pos.stopLoss == null ? (
                  <><div className="tabular-nums text-muted-foreground">—</div>{suggestedLine}</>
                ) : (
                  <>
                    <div className={cn("tabular-nums flex items-center justify-end gap-1", priceColor)}>
                      {pos.isStopLossAlert && <AlertTriangle className="h-3.5 w-3.5" />}
                      {pos.stopLoss.toFixed(2)}
                    </div>
                    <div className={cn("text-[11px] tabular-nums mt-0.5", distanceColor)}>
                      {distance != null ? formatPct(distance) : "—"}
                    </div>
                    {suggestedLine}
                  </>
                );
              if (!pos.latestOpenBuyTradeId) return content;
              return (
                <StopLossEditor tradeId={pos.latestOpenBuyTradeId} stopLoss={pos.stopLoss} title={t("positions.editStopLoss")}>
                  {content}
                </StopLossEditor>
              );
            })()}
          </td>
        );
      case "pnlAtStopLoss":
        return (
          <td key={colId} className={cn(
            "hidden md:table-cell px-4 py-3 text-right tabular-nums",
            pos.pnlAtStopLoss == null ? "text-muted-foreground"
              : pos.pnlAtStopLoss >= 0 ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}>
            {pos.pnlAtStopLoss != null ? (
              <>
                <div className="font-medium">{formatCurrency(pos.pnlAtStopLoss, pos.currency, true)}</div>
                {pos.pnlAtStopLossPct != null && <div className="text-[11px] mt-0.5">{formatPct(pos.pnlAtStopLossPct)}</div>}
              </>
            ) : "—"}
          </td>
        );
      case "totalCost":
        return (
          <td key={colId} className="hidden md:table-cell px-4 py-3 text-right tabular-nums">
            {formatCurrency(pos.totalCost, pos.currency)}
          </td>
        );
      case "marketValue":
        return (
          <td key={colId} className="hidden md:table-cell px-4 py-3 text-right tabular-nums">
            {pos.marketValue != null ? formatCurrency(pos.marketValue, pos.currency) : "—"}
          </td>
        );
      case "unrealizedPnL":
        return (
          <td key={colId} className={cn(
            "hidden md:table-cell px-4 py-3 text-right tabular-nums font-medium",
            pos.unrealizedPnL == null ? "text-muted-foreground"
              : pnlPositive ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}>
            {pos.unrealizedPnL != null ? formatCurrency(pos.unrealizedPnL, pos.currency, true) : "—"}
          </td>
        );
      case "totalPnLPct":
        return (
          <td key={colId} className={cn(
            "hidden md:table-cell px-4 py-3 text-right tabular-nums font-medium",
            pos.totalPnLPct == null ? "text-muted-foreground"
              : pos.totalPnLPct >= 0 ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}>
            {pos.totalPnLPct != null ? formatPct(pos.totalPnLPct) : "—"}
          </td>
        );
      case "actions":
        return (
          <td key={colId} className="hidden md:table-cell px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
            <Button asChild variant="outline" size="sm" className="h-7 px-2">
              <Link
                href={{
                  pathname: "/journal/new",
                  query: {
                    symbol: pos.symbol,
                    ...(pos.symbolName ? { symbolName: pos.symbolName } : {}),
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
        );
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t(titleKey)}</CardTitle>
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
                    {order.map((colId, posIdx) => renderHeaderCell(colId as PosColId, posIdx))}
                  </tr>
                </thead>
                {sortedPositions.map((pos) => {
                  const hasNotes = pos.notes.length > 0;
                  const hasHistory = (pos.stopLossHistory?.length ?? 0) > 0;
                  const isExp = expanded.has(pos.symbol);
                  return (
                    <tbody key={pos.symbol}>
                      <tr
                        className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer", isExp && "bg-muted/20")}
                        onClick={() => toggle(pos.symbol)}
                      >
                        {order.map((colId) => renderBodyCell(colId as PosColId, pos))}
                      </tr>

                      {isExp && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={order.length} className="px-4 md:px-8 py-3">
                            <div className="hidden md:flex items-center gap-6 text-xs mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">{t("positions.sharesHeader")}:</span>
                                <span className="tabular-nums">
                                  {pos.currency === "USD"
                                    ? `${pos.totalShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${t("common.shares")}`
                                    : pos.totalShares >= 1000 ? `${pos.totalShares / 1000} ${t("common.lots")}` : `${pos.totalShares} ${t("common.shares")}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">{t("positions.realizedHeader")}:</span>
                                <span className={cn(
                                  "tabular-nums font-medium",
                                  !pos.realizedPnL ? "text-muted-foreground"
                                    : pos.realizedPnL > 0 ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                )}>
                                  {formatCurrency(pos.realizedPnL ?? 0, pos.currency, true)}
                                </span>
                              </div>
                            </div>

                            <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                              <DetailItem
                                label={t("positions.sharesHeader")}
                                value={
                                  pos.currency === "USD"
                                    ? `${pos.totalShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${t("common.shares")}`
                                    : pos.totalShares >= 1000 ? `${pos.totalShares / 1000} ${t("common.lots")}` : `${pos.totalShares} ${t("common.shares")}`
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
                                  pos.dailyChange == null ? "text-muted-foreground"
                                    : pos.dailyChange > 0 ? "text-green-600 dark:text-green-400"
                                    : pos.dailyChange < 0 ? "text-red-600 dark:text-red-400"
                                    : "text-muted-foreground"
                                }
                              />
                              <DetailItem
                                label={t("positions.holdingDaysHeader")}
                                value={pos.holdingDays != null ? `${pos.holdingDays} ${t("positions.daysUnit")}` : "—"}
                              />
                              <DetailItem
                                label={t("positions.stopLossPnLHeader")}
                                value={
                                  pos.pnlAtStopLoss != null
                                    ? `${formatCurrency(pos.pnlAtStopLoss, pos.currency, true)}${pos.pnlAtStopLossPct != null ? ` (${formatPct(pos.pnlAtStopLossPct)})` : ""}`
                                    : "—"
                                }
                                valueClassName={
                                  pos.pnlAtStopLoss == null ? "text-muted-foreground"
                                    : pos.pnlAtStopLoss >= 0 ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }
                              />
                              <DetailItem label={t("positions.costHeader")} value={formatCurrency(pos.totalCost, pos.currency)} />
                              <DetailItem
                                label={t("positions.valueHeader")}
                                value={pos.marketValue != null ? formatCurrency(pos.marketValue, pos.currency) : "—"}
                              />
                              <DetailItem
                                label={t("positions.unrealizedHeader")}
                                value={pos.unrealizedPnL != null ? formatCurrency(pos.unrealizedPnL, pos.currency, true) : "—"}
                                valueClassName={
                                  pos.unrealizedPnL == null ? "text-muted-foreground"
                                    : (pos.unrealizedPnL ?? 0) >= 0 ? "text-green-600 dark:text-green-400 font-medium"
                                    : "text-red-600 dark:text-red-400 font-medium"
                                }
                              />
                              <DetailItem
                                label={t("positions.realizedHeader")}
                                value={formatCurrency(pos.realizedPnL ?? 0, pos.currency, true)}
                                valueClassName={
                                  !pos.realizedPnL ? "text-muted-foreground"
                                    : pos.realizedPnL > 0 ? "text-green-600 dark:text-green-400 font-medium"
                                    : "text-red-600 dark:text-red-400 font-medium"
                                }
                              />
                              <DetailItem
                                label={t("positions.returnHeader")}
                                value={pos.totalPnLPct != null ? formatPct(pos.totalPnLPct) : "—"}
                                valueClassName={
                                  pos.totalPnLPct == null ? "text-muted-foreground"
                                    : pos.totalPnLPct >= 0 ? "text-green-600 dark:text-green-400 font-medium"
                                    : "text-red-600 dark:text-red-400 font-medium"
                                }
                              />
                              <div className="col-span-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                <Button asChild variant="outline" size="sm" className="h-7 w-full">
                                  <Link
                                    href={{
                                      pathname: "/journal/new",
                                      query: {
                                        symbol: pos.symbol,
                                        ...(pos.symbolName ? { symbolName: pos.symbolName } : {}),
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
                                  <div key={i} className="text-muted-foreground pl-2 border-l-2 border-border">
                                    <span className="block text-[11px] tabular-nums opacity-70">{formatDate(note.date)}</span>
                                    <p className="whitespace-pre-wrap">{note.note}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {hasHistory && (
                              <div className="text-xs space-y-1.5 mt-3">
                                <p className="text-muted-foreground font-medium">{t("positions.stopLossHistoryTitle")}</p>
                                {pos.stopLossHistory!.map((adj, i) => (
                                  <div key={i} className="text-muted-foreground pl-2 border-l-2 border-border">
                                    <span className="block text-[11px] tabular-nums opacity-70">{formatDate(adj.date)}</span>
                                    <p className="tabular-nums">
                                      {adj.previousStopLoss != null ? adj.previousStopLoss.toFixed(2) : "—"}
                                      {" → "}
                                      <span className="font-medium text-foreground">
                                        {adj.newStopLoss != null ? adj.newStopLoss.toFixed(2) : "—"}
                                      </span>
                                    </p>
                                    {adj.note && <p className="whitespace-pre-wrap">{adj.note}</p>}
                                  </div>
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
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      setValue(stopLoss != null ? String(stopLoss) : "");
      setNote("");
      setError(null);
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
        body: JSON.stringify({ stopLoss: payload, stopLossNote: note.trim() || undefined }),
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
      <div className="flex flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Input
            ref={inputRef}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); void save(); }
              else if (e.key === "Escape") { e.preventDefault(); close(); }
            }}
            disabled={saving}
            aria-label={t("positions.stopLossPrice")}
            className={cn("h-7 w-20 px-1.5 text-right tabular-nums text-sm", error && "border-red-500 focus-visible:ring-red-500")}
          />
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void save()} disabled={saving} aria-label={t("common.save")} title={t("common.save")}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={close} disabled={saving} aria-label={t("common.cancel")} title={t("common.cancel")}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); close(); } }}
          disabled={saving}
          rows={2}
          placeholder={t("positions.stopLossNotePlaceholder")}
          aria-label={t("positions.stopLossNote")}
          className="w-44 text-xs resize-none text-left"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="block w-full text-right -mx-2 -my-1 px-2 py-1 rounded hover:bg-muted/60 transition-colors"
    >
      {children}
    </button>
  );
}
