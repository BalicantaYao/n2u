"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTWD, formatDate, formatShares, cn } from "@/lib/utils";
import { ChevronDown, Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { Trade } from "@/types/trade";

interface TradeTableProps {
  trades: Trade[];
  onDelete: (id: string) => void;
}

export function TradeTable({ trades, onDelete }: TradeTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">尚無交易記錄</p>
        <a href="/journal/new" className="text-primary underline text-sm mt-1 inline-block">
          新增第一筆交易
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden divide-y">
        {trades.map((t) => {
          const isExp = expanded.has(t.id);
          return (
            <div key={t.id} className="p-4">
              {/* Row 1: symbol + badge + delete */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">{t.symbol}</span>
                  {t.symbolName && (
                    <span className="text-xs text-muted-foreground">{t.symbolName}</span>
                  )}
                  <Badge variant={t.market === "TWSE" ? "twse" : "tpex"} className="text-xs py-0">
                    {t.market === "TWSE" ? "上市" : "上櫃"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/journal/${t.id}/edit`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm("確定要刪除這筆交易？")) onDelete(t.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Row 2: date + side + shares + price */}
              <div className="flex items-center gap-3 text-sm mb-2">
                <span className="text-muted-foreground text-xs">{formatDate(t.tradeDate)}</span>
                <Badge variant={t.side === "BUY" ? "profit" : "loss"} className="text-xs">
                  {t.side === "BUY" ? "買進" : "賣出"}
                </Badge>
                <span className="tabular-nums text-xs">{formatShares(t.shares, t.lotType as "ROUND" | "ODD")}</span>
                <span className="tabular-nums text-xs">@ {t.price.toLocaleString()}</span>
              </div>

              {/* Row 3: PnL + expand toggle */}
              <div className="flex items-center justify-between">
                <div>
                  {t.realizedPnL != null ? (
                    <span
                      className={cn(
                        "font-semibold tabular-nums text-sm",
                        t.realizedPnL > 0 && "text-green-600 dark:text-green-400",
                        t.realizedPnL < 0 && "text-red-600 dark:text-red-400"
                      )}
                    >
                      {formatTWD(t.realizedPnL, true)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">持倉中</span>
                  )}
                </div>
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground py-1 px-2 rounded"
                  onClick={() => toggle(t.id)}
                >
                  <span>{isExp ? "收起" : "詳情"}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExp && "rotate-180")} />
                </button>
              </div>

              {/* Expanded details */}
              {isExp && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">手續費</p>
                    <p className="tabular-nums">{formatTWD(t.commission)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">證交稅</p>
                    <p className="tabular-nums">{formatTWD(t.transactionTax)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">成交金額</p>
                    <p className="tabular-nums">{formatTWD(t.grossAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">淨金額</p>
                    <p className="tabular-nums">{formatTWD(t.netAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">交割日</p>
                    <p>{t.settlementDate ? formatDate(t.settlementDate) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">類型</p>
                    <p>{t.isETF ? "ETF" : "股票"} / {t.lotType === "ROUND" ? "整張" : "零股"}</p>
                  </div>
                  {t.stopLoss && (
                    <div>
                      <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />停損價
                      </p>
                      <p className="tabular-nums text-red-600 dark:text-red-400 font-medium">
                        {t.stopLoss.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {t.takeProfit && (
                    <div>
                      <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-green-500" />停利價
                      </p>
                      <p className="tabular-nums text-green-600 dark:text-green-400 font-medium">
                        {t.takeProfit.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {t.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground mb-0.5">備註</p>
                      <p className="whitespace-pre-wrap">{t.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: original table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground bg-muted/30">
              <th className="text-left py-3 px-4 font-medium w-6"></th>
              <th className="text-left py-3 pr-4 font-medium">日期</th>
              <th className="text-left py-3 pr-4 font-medium">代號</th>
              <th className="text-left py-3 pr-4 font-medium">方向</th>
              <th className="text-right py-3 pr-4 font-medium">數量</th>
              <th className="text-right py-3 pr-4 font-medium">均價</th>
              <th className="text-right py-3 pr-4 font-medium">手續費</th>
              <th className="text-right py-3 pr-4 font-medium">證交稅</th>
              <th className="text-right py-3 pr-4 font-medium">損益</th>
              <th className="text-center py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <>
                <tr
                  key={t.id}
                  className="border-b hover:bg-muted/40 cursor-pointer"
                  onClick={() => toggle(t.id)}
                >
                  <td className="py-3 px-4">
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        expanded.has(t.id) && "rotate-180"
                      )}
                    />
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                    {formatDate(t.tradeDate)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{t.symbol}</span>
                      <Badge
                        variant={t.market === "TWSE" ? "twse" : "tpex"}
                        className="text-xs py-0"
                      >
                        {t.market === "TWSE" ? "上市" : "上櫃"}
                      </Badge>
                    </div>
                    {t.symbolName && (
                      <p className="text-xs text-muted-foreground">{t.symbolName}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={t.side === "BUY" ? "profit" : "loss"}
                      className="text-xs"
                    >
                      {t.side === "BUY" ? "買進" : "賣出"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatShares(t.shares, t.lotType as "ROUND" | "ODD")}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {t.price.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                    {formatTWD(t.commission)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                    {formatTWD(t.transactionTax)}
                  </td>
                  <td
                    className={cn(
                      "py-3 pr-4 text-right tabular-nums font-medium",
                      t.realizedPnL != null && t.realizedPnL > 0 && "text-green-600 dark:text-green-400",
                      t.realizedPnL != null && t.realizedPnL < 0 && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {t.realizedPnL != null
                      ? formatTWD(t.realizedPnL, true)
                      : <span className="text-muted-foreground text-xs">持倉中</span>}
                  </td>
                  <td className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/journal/${t.id}/edit`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm("確定要刪除這筆交易？")) {
                            onDelete(t.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>

                {expanded.has(t.id) && (
                  <tr key={`${t.id}-expanded`} className="bg-muted/20 border-b">
                    <td colSpan={10} className="px-10 py-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-0.5">交割日</p>
                          <p>{t.settlementDate ? formatDate(t.settlementDate) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">成交金額</p>
                          <p className="tabular-nums">{formatTWD(t.grossAmount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">淨金額</p>
                          <p className="tabular-nums">{formatTWD(t.netAmount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">類型</p>
                          <p>{t.isETF ? "ETF" : "股票"} / {t.lotType === "ROUND" ? "整張" : "零股"}</p>
                        </div>
                        {(t.stopLoss || t.takeProfit) && (
                          <>
                            {t.stopLoss && (
                              <div>
                                <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                  停損價
                                </p>
                                <p className="tabular-nums text-red-600 dark:text-red-400 font-medium">
                                  {t.stopLoss.toLocaleString()} TWD
                                </p>
                              </div>
                            )}
                            {t.takeProfit && (
                              <div>
                                <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-green-500" />
                                  停利價
                                </p>
                                <p className="tabular-nums text-green-600 dark:text-green-400 font-medium">
                                  {t.takeProfit.toLocaleString()} TWD
                                </p>
                              </div>
                            )}
                          </>
                        )}
                        {t.notes && (
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-muted-foreground mb-0.5">備註</p>
                            <p className="whitespace-pre-wrap">{t.notes}</p>
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
