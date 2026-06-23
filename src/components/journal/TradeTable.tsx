"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatShares, cn, tradingViewUrl } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { ChevronDown, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useColumnResize } from "@/hooks/useColumnResize";
import { useColumnOrder } from "@/hooks/useColumnOrder";
import type { Trade } from "@/types/trade";
import type { Market } from "@/types/taiwan";

const TRADE_TABLE_DEFAULT_WIDTHS = [40, 100, 160, 80, 90, 90, 110, 120, 110, 90];
const TRADE_COL_IDS = ["expand", "date", "symbol", "side", "shares", "price", "commission", "tax", "pnl", "actions"] as const;
type TradeColId = typeof TRADE_COL_IDS[number];
const TRADE_FIXED_COLS = new Set<string>(["expand", "actions"]);

function marketBadgeVariant(m: Market): "twse" | "tpex" | "nyse" | "nasdaq" {
  if (m === "NYSE") return "nyse";
  if (m === "NASDAQ") return "nasdaq";
  if (m === "TPEX") return "tpex";
  return "twse";
}

function marketLabel(m: Market, t: (k: string) => string): string {
  if (m === "NYSE") return "NYSE";
  if (m === "NASDAQ") return "NASDAQ";
  return m === "TPEX" ? t("common.tpex") : t("common.twse");
}

interface TradeTableProps {
  trades: Trade[];
  onDelete: (id: string) => void;
}

export function TradeTable({ trades, onDelete }: TradeTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { t } = useT();
  const { widths, startResize } = useColumnResize("trade-table-col-widths", TRADE_TABLE_DEFAULT_WIDTHS);
  const { order, moveColumn } = useColumnOrder("trade-table-col-order", [...TRADE_COL_IDS]);

  const dragColRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function handleDragStart(posIdx: number, colId: string) {
    if (TRADE_FIXED_COLS.has(colId)) return;
    dragColRef.current = posIdx;
  }

  function handleDragOver(e: React.DragEvent, posIdx: number, colId: string) {
    if (TRADE_FIXED_COLS.has(colId)) return;
    if (dragColRef.current === null) return;
    e.preventDefault();
    setDragOverIdx(posIdx);
  }

  function handleDrop(posIdx: number, colId: string) {
    if (TRADE_FIXED_COLS.has(colId)) return;
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

  function getColLabel(colId: TradeColId): string {
    switch (colId) {
      case "expand": return "";
      case "date": return t("common.date");
      case "symbol": return t("common.symbol");
      case "side": return t("common.direction");
      case "shares": return t("common.quantity");
      case "price": return t("common.avgPrice");
      case "commission": return t("common.commission");
      case "tax": return t("common.transactionTax");
      case "pnl": return t("common.pnl");
      case "actions": return t("common.actions");
    }
  }

  function getColAlign(colId: TradeColId): "left" | "right" | "center" {
    switch (colId) {
      case "shares":
      case "price":
      case "commission":
      case "tax":
      case "pnl":
        return "right";
      case "actions":
        return "center";
      default:
        return "left";
    }
  }

  function renderBodyCell(colId: TradeColId, tr: Trade) {
    switch (colId) {
      case "expand":
        return (
          <td key={colId} className="py-3 px-3">
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded.has(tr.id) && "rotate-180")} />
          </td>
        );
      case "date":
        return (
          <td key={colId} className="py-3 px-3 text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            {formatDate(tr.tradeDate)}
          </td>
        );
      case "symbol":
        return (
          <td key={colId} className="py-3 px-3 overflow-hidden">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <a
                href={tradingViewUrl(tr.symbol, tr.market)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-medium hover:text-primary hover:underline truncate"
                title="View on TradingView"
              >
                {tr.symbol}
              </a>
              <Badge variant={marketBadgeVariant(tr.market)} className="text-xs py-0 shrink-0">
                {marketLabel(tr.market, t)}
              </Badge>
            </div>
            {tr.symbolName && <p className="text-xs text-muted-foreground truncate">{tr.symbolName}</p>}
          </td>
        );
      case "side":
        return (
          <td key={colId} className="py-3 px-3 overflow-hidden">
            <Badge variant={tr.side === "BUY" ? "profit" : "loss"} className="text-xs">
              {tr.side === "BUY" ? t("common.buy") : t("common.sell")}
            </Badge>
          </td>
        );
      case "shares":
        return (
          <td key={colId} className="py-3 px-3 text-right tabular-nums overflow-hidden text-ellipsis">
            {formatShares(tr.shares, tr.lotType as "ROUND" | "ODD", tr.market)}
          </td>
        );
      case "price":
        return (
          <td key={colId} className="py-3 px-3 text-right tabular-nums overflow-hidden text-ellipsis">
            {tr.price.toLocaleString()}
          </td>
        );
      case "commission":
        return (
          <td key={colId} className="py-3 px-3 text-right tabular-nums text-muted-foreground overflow-hidden text-ellipsis">
            {formatCurrency(tr.commission, tr.currency)}
          </td>
        );
      case "tax":
        return (
          <td key={colId} className="py-3 px-3 text-right tabular-nums text-muted-foreground overflow-hidden text-ellipsis">
            {formatCurrency(tr.transactionTax, tr.currency)}
          </td>
        );
      case "pnl":
        return (
          <td
            key={colId}
            className={cn(
              "py-3 px-3 text-right tabular-nums font-medium overflow-hidden text-ellipsis",
              tr.realizedPnL != null && tr.realizedPnL > 0 && "text-green-600 dark:text-green-400",
              tr.realizedPnL != null && tr.realizedPnL < 0 && "text-red-600 dark:text-red-400"
            )}
          >
            {tr.realizedPnL != null
              ? formatCurrency(tr.realizedPnL, tr.currency, true)
              : <span className="text-muted-foreground text-xs">{t("common.inPosition")}</span>}
          </td>
        );
      case "actions":
        return (
          <td key={colId} className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-1">
              <Link href={`/journal/${tr.id}/edit`}>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => { if (confirm(t("common.confirmDelete"))) onDelete(tr.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        );
    }
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">{t("journal.noRecords")}</p>
        <a href="/journal/new" className="text-primary underline text-sm mt-1 inline-block">
          {t("journal.addFirstTrade")}
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden divide-y">
        {trades.map((tr) => {
          const isExp = expanded.has(tr.id);
          return (
            <div key={tr.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <a
                    href={tradingViewUrl(tr.symbol, tr.market)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-base hover:text-primary hover:underline"
                    title="View on TradingView"
                  >
                    {tr.symbol}
                  </a>
                  {tr.symbolName && (
                    <span className="text-xs text-muted-foreground">{tr.symbolName}</span>
                  )}
                  <Badge variant={marketBadgeVariant(tr.market)} className="text-xs py-0">
                    {marketLabel(tr.market, t)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/journal/${tr.id}/edit`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => { if (confirm(t("common.confirmDelete"))) onDelete(tr.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm mb-2">
                <span className="text-muted-foreground text-xs">{formatDate(tr.tradeDate)}</span>
                <Badge variant={tr.side === "BUY" ? "profit" : "loss"} className="text-xs">
                  {tr.side === "BUY" ? t("common.buy") : t("common.sell")}
                </Badge>
                <span className="tabular-nums text-xs">{formatShares(tr.shares, tr.lotType as "ROUND" | "ODD", tr.market)}</span>
                <span className="tabular-nums text-xs">@ {tr.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  {tr.realizedPnL != null ? (
                    <span className={cn(
                      "font-semibold tabular-nums text-sm",
                      tr.realizedPnL > 0 && "text-green-600 dark:text-green-400",
                      tr.realizedPnL < 0 && "text-red-600 dark:text-red-400"
                    )}>
                      {formatCurrency(tr.realizedPnL, tr.currency, true)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">{t("common.inPosition")}</span>
                  )}
                </div>
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground py-1 px-2 rounded"
                  onClick={() => toggle(tr.id)}
                >
                  <span>{isExp ? t("journal.collapse") : t("journal.details")}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExp && "rotate-180")} />
                </button>
              </div>
              {isExp && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">{t("common.commission")}</p>
                    <p className="tabular-nums">{formatCurrency(tr.commission, tr.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">{t("common.transactionTax")}</p>
                    <p className="tabular-nums">{formatCurrency(tr.transactionTax, tr.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">{t("journal.grossAmount")}</p>
                    <p className="tabular-nums">{formatCurrency(tr.grossAmount, tr.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">{t("journal.netAmount")}</p>
                    <p className="tabular-nums">{formatCurrency(tr.netAmount, tr.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">{t("journal.settlementDate")}</p>
                    <p>{tr.settlementDate ? formatDate(tr.settlementDate) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">{t("journal.type")}</p>
                    <p>{tr.isETF ? "ETF" : t("common.stock")} / {tr.lotType === "ROUND" ? t("common.roundLot") : t("common.oddLot")}</p>
                  </div>
                  {tr.stopLoss && (
                    <div>
                      <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />{t("journal.stopLoss")}
                      </p>
                      <p className="tabular-nums text-red-600 dark:text-red-400 font-medium">
                        {tr.stopLoss.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {tr.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground mb-0.5">{t("common.notes")}</p>
                      <p className="whitespace-pre-wrap">{tr.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: table with draggable column headers */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground bg-muted/30">
              {order.map((colId, posIdx) => {
                const id = colId as TradeColId;
                const isFixed = TRADE_FIXED_COLS.has(colId);
                const isDragTarget = dragOverIdx === posIdx && dragColRef.current !== posIdx && !isFixed;
                const align = getColAlign(id);
                return (
                  <th
                    key={colId}
                    className={cn(
                      "py-3 px-3 font-medium relative select-none",
                      `text-${align}`,
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
            {trades.map((tr) => (
              <>
                <tr
                  key={tr.id}
                  className="border-b hover:bg-muted/40 cursor-pointer"
                  onClick={() => toggle(tr.id)}
                >
                  {order.map((colId) => renderBodyCell(colId as TradeColId, tr))}
                </tr>
                {expanded.has(tr.id) && (
                  <tr key={`${tr.id}-expanded`} className="bg-muted/20 border-b">
                    <td colSpan={order.length} className="px-10 py-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-0.5">{t("journal.settlementDate")}</p>
                          <p>{tr.settlementDate ? formatDate(tr.settlementDate) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">{t("journal.grossAmount")}</p>
                          <p className="tabular-nums">{formatCurrency(tr.grossAmount, tr.currency)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">{t("journal.netAmount")}</p>
                          <p className="tabular-nums">{formatCurrency(tr.netAmount, tr.currency)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">{t("journal.type")}</p>
                          <p>{tr.isETF ? "ETF" : t("common.stock")} / {tr.lotType === "ROUND" ? t("common.roundLot") : t("common.oddLot")}</p>
                        </div>
                        {tr.stopLoss && (
                          <div>
                            <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              {t("journal.stopLoss")}
                            </p>
                            <p className="tabular-nums text-red-600 dark:text-red-400 font-medium">
                              {formatCurrency(tr.stopLoss, tr.currency)}
                            </p>
                          </div>
                        )}
                        {tr.notes && (
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-muted-foreground mb-0.5">{t("common.notes")}</p>
                            <p className="whitespace-pre-wrap">{tr.notes}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
