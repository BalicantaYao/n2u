"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPct, formatDate, tradingViewUrl, cn } from "@/lib/utils";
import { AddObservationButton } from "@/components/observations/AddObservationButton";
import { useT } from "@/lib/i18n";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useColumnOrder } from "@/hooks/useColumnOrder";
import type { SymbolResult, SellTradeDetail } from "@/types/trade";
import type { Currency } from "@/types/taiwan";

const RESULTS_TABLE_DEFAULT_WIDTHS = [32, 160, 80, 120, 120, 100, 110, 120];
const SELL_LIST_DEFAULT_WIDTHS = [120, 100, 160, 90, 100, 100, 120, 120, 100];

const RESULTS_COL_IDS = ["expand", "symbol", "count", "buyCost", "pnl", "return", "winLoss", "lastTrade"] as const;
type ResultsColId = typeof RESULTS_COL_IDS[number];
const RESULTS_FIXED_COLS = new Set<string>(["expand"]);

const SELL_LIST_COL_IDS = ["buyDate", "date", "symbol", "shares", "buyAvgPrice", "sellPrice", "buyCost", "pnl", "return"] as const;
type SellListColId = typeof SELL_LIST_COL_IDS[number];

interface ResultsTableProps {
  bySymbol: SymbolResult[];
}

export function ResultsTable({ bySymbol }: ResultsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { t } = useT();
  const { widths, startResize } = useColumnResize("results-table-col-widths", RESULTS_TABLE_DEFAULT_WIDTHS);
  const { order, moveColumn } = useColumnOrder("results-table-col-order", [...RESULTS_COL_IDS]);

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

  function handleDragStart(posIdx: number, colId: string) {
    if (RESULTS_FIXED_COLS.has(colId)) return;
    dragColRef.current = posIdx;
  }

  function handleDragOver(e: React.DragEvent, posIdx: number, colId: string) {
    if (RESULTS_FIXED_COLS.has(colId)) return;
    if (dragColRef.current === null) return;
    e.preventDefault();
    setDragOverIdx(posIdx);
  }

  function handleDrop(posIdx: number, colId: string) {
    if (RESULTS_FIXED_COLS.has(colId)) return;
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

  function getColLabel(colId: ResultsColId): string {
    switch (colId) {
      case "expand": return "";
      case "symbol": return t("results.symbolHeader");
      case "count": return t("results.countHeader");
      case "buyCost": return t("results.buyCost");
      case "pnl": return t("results.realizedPnLHeader");
      case "return": return t("results.returnHeader");
      case "winLoss": return t("results.winLossHeader");
      case "lastTrade": return t("results.lastTrade");
    }
  }

  function getColCls(colId: ResultsColId): string {
    switch (colId) {
      case "count": return "hidden md:table-cell";
      case "buyCost": return "hidden lg:table-cell";
      case "return": return "hidden sm:table-cell";
      case "winLoss": return "hidden md:table-cell";
      case "lastTrade": return "hidden lg:table-cell";
      default: return "";
    }
  }

  function getColAlign(colId: ResultsColId): "left" | "right" {
    return colId === "expand" || colId === "symbol" ? "left" : "right";
  }

  function renderBodyCell(colId: ResultsColId, row: SymbolResult) {
    const isOpen = expanded.has(row.symbol);
    const pnlColor =
      row.totalRealizedPnL > 0
        ? "text-green-600 dark:text-green-400"
        : row.totalRealizedPnL < 0
        ? "text-red-600 dark:text-red-400"
        : "";

    switch (colId) {
      case "expand":
        return (
          <td key={colId} className="py-2.5 px-3 text-muted-foreground">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </td>
        );
      case "symbol":
        return (
          <td key={colId} className="py-2.5 px-3">
            <div className="flex items-center gap-1.5">
              <a
                href={tradingViewUrl(row.symbol, row.market)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-medium hover:text-primary hover:underline"
                title="View on TradingView"
              >
                {row.symbol}
              </a>
              <AddObservationButton symbol={row.symbol} symbolName={row.symbolName} market={row.market} />
              <Link
                href={`/journal?symbol=${encodeURIComponent(row.symbol)}&currency=${row.currency}`}
                onClick={(e) => e.stopPropagation()}
                title={t("results.viewInJournal")}
                aria-label={t("results.viewInJournal")}
                className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              >
                <ScrollText className="h-4 w-4" />
              </Link>
            </div>
            {row.symbolName && <div className="text-xs text-muted-foreground">{row.symbolName}</div>}
          </td>
        );
      case "count":
        return (
          <td key={colId} className="py-2.5 px-3 text-right hidden md:table-cell tabular-nums">
            {row.tradeCount}
          </td>
        );
      case "buyCost":
        return (
          <td key={colId} className="py-2.5 px-3 text-right hidden lg:table-cell tabular-nums text-muted-foreground">
            {formatCurrency(row.totalBuyCost, row.currency)}
          </td>
        );
      case "pnl":
        return (
          <td key={colId} className={`py-2.5 px-3 text-right tabular-nums font-semibold ${pnlColor}`}>
            {formatCurrency(row.totalRealizedPnL, row.currency, true)}
          </td>
        );
      case "return":
        return (
          <td key={colId} className={`py-2.5 px-3 text-right hidden sm:table-cell tabular-nums ${pnlColor}`}>
            {formatPct(row.realizedPnLPct)}
          </td>
        );
      case "winLoss":
        return (
          <td key={colId} className="py-2.5 px-3 text-right hidden md:table-cell">
            <span className="text-green-600 dark:text-green-400">{t("results.winCount", { count: row.winCount })}</span>
            <span className="text-muted-foreground mx-0.5">/</span>
            <span className="text-red-600 dark:text-red-400">{t("results.lossCount", { count: row.lossCount })}</span>
          </td>
        );
      case "lastTrade":
        return (
          <td key={colId} className="py-2.5 px-3 text-right hidden lg:table-cell text-muted-foreground">
            {formatDate(row.lastTradeDate)}
          </td>
        );
    }
  }

  if (bySymbol.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        {t("results.noRecords")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            {order.map((colId, posIdx) => {
              const id = colId as ResultsColId;
              const isFixed = RESULTS_FIXED_COLS.has(colId);
              const isDragTarget = dragOverIdx === posIdx && dragColRef.current !== posIdx && !isFixed;
              const align = getColAlign(id);
              const cls = getColCls(id);
              return (
                <th
                  key={colId}
                  className={cn(
                    "py-2.5 px-3 font-medium relative select-none",
                    `text-${align}`,
                    cls,
                    !isFixed && "cursor-grab active:cursor-grabbing",
                    isDragTarget && "border-l-2 border-primary bg-primary/5"
                  )}
                  style={{ minWidth: widths[posIdx] }}
                  draggable={!isFixed}
                  onDragStart={() => handleDragStart(posIdx, colId)}
                  onDragOver={(e) => handleDragOver(e, posIdx, colId)}
                  onDrop={() => handleDrop(posIdx, colId)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="pr-2">{getColLabel(id)}</span>
                  {posIdx < order.length - 1 && (
                    <div
                      className="absolute inset-y-0 right-0 w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10"
                      onMouseDown={startResize(posIdx)}
                      draggable={false}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {bySymbol.map((row) => {
            const isOpen = expanded.has(row.symbol);
            return (
              <>
                <tr
                  key={row.symbol}
                  className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => toggle(row.symbol)}
                >
                  {order.map((colId) => renderBodyCell(colId as ResultsColId, row))}
                </tr>
                {isOpen && (
                  <tr key={`${row.symbol}-detail`} className="bg-muted/20">
                    <td colSpan={order.length} className="px-0 py-0">
                      <ExpandedTrades trades={row.trades} currency={row.currency} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatBuyDate(tr: SellTradeDetail): string {
  if (!tr.buyDate) return "—";
  const start = formatDate(tr.buyDate);
  if (tr.buyDateEnd) return `${start} ~ ${formatDate(tr.buyDateEnd)}`;
  return start;
}

function ExpandedTrades({
  trades,
  currency,
}: {
  trades: SellTradeDetail[];
  currency: Currency;
}) {
  const { t } = useT();
  const isUS = currency === "USD";

  return (
    <div className="pl-10 pr-3 py-2 border-b">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left py-1.5 px-2">{t("results.buyDate")}</th>
            <th className="text-left py-1.5 px-2">{t("results.tradeDate")}</th>
            <th className="text-right py-1.5 px-2">{t("results.sharesHeader")}</th>
            <th className="text-right py-1.5 px-2 hidden md:table-cell">{t("results.buyAvgPrice")}</th>
            <th className="text-right py-1.5 px-2">{t("results.sellAvgPrice")}</th>
            <th className="text-right py-1.5 px-2 hidden sm:table-cell">{t("results.buyCost")}</th>
            <th className="text-right py-1.5 px-2">{t("results.realizedPnLHeader")}</th>
            <th className="text-right py-1.5 px-2 hidden sm:table-cell">{t("results.returnHeader")}</th>
            <th className="text-left py-1.5 px-2 hidden lg:table-cell">{t("common.notes")}</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((tr) => {
            const pnlColor =
              tr.realizedPnL > 0
                ? "text-green-600 dark:text-green-400"
                : tr.realizedPnL < 0
                ? "text-red-600 dark:text-red-400"
                : "";
            const sharesLabel = isUS
              ? `${tr.shares.toLocaleString()} ${t("common.shares")}`
              : tr.lotType === "ROUND"
                ? `${tr.shares / 1000} ${t("common.lots")}`
                : `${tr.shares} ${t("common.shares")}`;

            return (
              <tr key={tr.id} className="border-t border-border/50">
                <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">{formatBuyDate(tr)}</td>
                <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">{formatDate(tr.tradeDate)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{sharesLabel}</td>
                <td className="py-1.5 px-2 text-right hidden md:table-cell tabular-nums text-muted-foreground">
                  {tr.buyAvgPrice > 0 ? tr.buyAvgPrice.toFixed(2) : "—"}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">{tr.price.toFixed(2)}</td>
                <td className="py-1.5 px-2 text-right hidden sm:table-cell tabular-nums text-muted-foreground">
                  {formatCurrency(tr.buyCost, currency)}
                </td>
                <td className={`py-1.5 px-2 text-right tabular-nums font-medium ${pnlColor}`}>
                  {formatCurrency(tr.realizedPnL, currency, true)}
                </td>
                <td className={`py-1.5 px-2 text-right hidden sm:table-cell tabular-nums ${pnlColor}`}>
                  {formatPct(tr.realizedPnLPct)}
                </td>
                <td className="py-1.5 px-2 hidden lg:table-cell text-muted-foreground truncate max-w-[200px]">
                  {tr.notes ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Tab 2: flat sell trade list
interface TradeListProps {
  bySymbol: SymbolResult[];
}

export function SellTradeList({ bySymbol }: TradeListProps) {
  const { t } = useT();
  const { widths: slWidths, startResize: slStartResize } = useColumnResize("sell-list-col-widths", SELL_LIST_DEFAULT_WIDTHS);
  const { order, moveColumn } = useColumnOrder("sell-list-col-order", [...SELL_LIST_COL_IDS]);

  const dragColRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function handleDragStart(posIdx: number) {
    dragColRef.current = posIdx;
  }

  function handleDragOver(e: React.DragEvent, posIdx: number) {
    if (dragColRef.current === null) return;
    e.preventDefault();
    setDragOverIdx(posIdx);
  }

  function handleDrop(posIdx: number) {
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

  const allTrades = bySymbol
    .flatMap((s) =>
      s.trades.map((tr) => ({
        ...tr,
        symbol: s.symbol,
        symbolName: s.symbolName,
        market: s.market,
        currency: s.currency,
      }))
    )
    .sort((a, b) => (b.tradeDate > a.tradeDate ? 1 : -1));

  if (allTrades.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        {t("results.noRecords")}
      </div>
    );
  }

  function getSlColLabel(colId: SellListColId): string {
    switch (colId) {
      case "buyDate": return t("results.buyDate");
      case "date": return t("common.date");
      case "symbol": return t("results.symbolHeader");
      case "shares": return t("results.sharesHeader");
      case "buyAvgPrice": return t("results.buyAvgPrice");
      case "sellPrice": return t("results.sellPrice");
      case "buyCost": return t("results.buyCost");
      case "pnl": return t("results.realizedPnLHeader");
      case "return": return t("results.returnHeader");
    }
  }

  function getSlColCls(colId: SellListColId): string {
    switch (colId) {
      case "buyDate": return "hidden md:table-cell";
      case "buyAvgPrice": return "hidden lg:table-cell";
      case "sellPrice": return "hidden sm:table-cell";
      case "buyCost": return "hidden md:table-cell";
      case "return": return "hidden sm:table-cell";
      default: return "";
    }
  }

  function getSlColAlign(colId: SellListColId): "left" | "right" {
    return colId === "buyDate" || colId === "date" || colId === "symbol" ? "left" : "right";
  }

  type SellTradeRow = SellTradeDetail & { symbol: string; symbolName?: string | null; market: string; currency: Currency };

  function renderSlCell(colId: SellListColId, tr: SellTradeRow) {
    const pnlColor =
      tr.realizedPnL > 0
        ? "text-green-600 dark:text-green-400"
        : tr.realizedPnL < 0
        ? "text-red-600 dark:text-red-400"
        : "";
    const isUS = tr.currency === "USD";
    const sharesLabel = isUS
      ? `${tr.shares.toLocaleString()} ${t("common.shares")}`
      : tr.lotType === "ROUND"
        ? `${tr.shares / 1000} ${t("common.lots")}`
        : `${tr.shares} ${t("common.shares")}`;

    switch (colId) {
      case "buyDate":
        return (
          <td key={colId} className="py-2.5 px-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
            {formatBuyDate(tr)}
          </td>
        );
      case "date":
        return (
          <td key={colId} className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
            {formatDate(tr.tradeDate)}
          </td>
        );
      case "symbol":
        return (
          <td key={colId} className="py-2.5 px-3">
            <div className="flex items-center gap-1.5">
              <a
                href={tradingViewUrl(tr.symbol, tr.market as import("@/types/taiwan").Market)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-primary hover:underline"
                title="View on TradingView"
              >
                {tr.symbol}
              </a>
              <Link
                href={`/journal?symbol=${encodeURIComponent(tr.symbol)}&currency=${tr.currency}`}
                title={t("results.viewInJournal")}
                aria-label={t("results.viewInJournal")}
                className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              >
                <ScrollText className="h-4 w-4" />
              </Link>
            </div>
            {tr.symbolName && <div className="text-xs text-muted-foreground">{tr.symbolName}</div>}
          </td>
        );
      case "shares":
        return (
          <td key={colId} className="py-2.5 px-3 text-right tabular-nums">{sharesLabel}</td>
        );
      case "buyAvgPrice":
        return (
          <td key={colId} className="py-2.5 px-3 text-right hidden lg:table-cell tabular-nums text-muted-foreground">
            {tr.buyAvgPrice > 0 ? tr.buyAvgPrice.toFixed(2) : "—"}
          </td>
        );
      case "sellPrice":
        return (
          <td key={colId} className="py-2.5 px-3 text-right hidden sm:table-cell tabular-nums">
            {tr.price.toFixed(2)}
          </td>
        );
      case "buyCost":
        return (
          <td key={colId} className="py-2.5 px-3 text-right hidden md:table-cell tabular-nums text-muted-foreground">
            {formatCurrency(tr.buyCost, tr.currency)}
          </td>
        );
      case "pnl":
        return (
          <td key={colId} className={`py-2.5 px-3 text-right tabular-nums font-semibold ${pnlColor}`}>
            {formatCurrency(tr.realizedPnL, tr.currency, true)}
          </td>
        );
      case "return":
        return (
          <td key={colId} className={`py-2.5 px-3 text-right hidden sm:table-cell tabular-nums ${pnlColor}`}>
            {formatPct(tr.realizedPnLPct)}
          </td>
        );
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            {order.map((colId, posIdx) => {
              const id = colId as SellListColId;
              const isDragTarget = dragOverIdx === posIdx && dragColRef.current !== posIdx;
              const align = getSlColAlign(id);
              const cls = getSlColCls(id);
              return (
                <th
                  key={colId}
                  className={cn(
                    "py-2.5 px-3 font-medium relative select-none cursor-grab active:cursor-grabbing",
                    `text-${align}`,
                    cls,
                    isDragTarget && "border-l-2 border-primary bg-primary/5"
                  )}
                  style={{ minWidth: slWidths[posIdx] }}
                  draggable
                  onDragStart={() => handleDragStart(posIdx)}
                  onDragOver={(e) => handleDragOver(e, posIdx)}
                  onDrop={() => handleDrop(posIdx)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="pr-2">{getSlColLabel(id)}</span>
                  {posIdx < order.length - 1 && (
                    <div
                      className="absolute inset-y-0 right-0 w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10"
                      onMouseDown={slStartResize(posIdx)}
                      draggable={false}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {allTrades.map((tr) => (
            <tr key={tr.id} className="border-b hover:bg-muted/40 transition-colors">
              {order.map((colId) => renderSlCell(colId as SellListColId, tr as SellTradeRow))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Badge helper (re-exported for page use)
export function PnLBadge({ value }: { value: number }) {
  const { t } = useT();
  if (value > 0)
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {t("results.profit")}
      </Badge>
    );
  if (value < 0)
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        {t("results.loss")}
      </Badge>
    );
  return <Badge variant="secondary">{t("results.breakeven")}</Badge>;
}
