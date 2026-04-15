"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTWD, formatPct, formatDate } from "@/lib/utils";
import type { SymbolResult, SellTradeDetail } from "@/types/trade";

interface ResultsTableProps {
  bySymbol: SymbolResult[];
}

export function ResultsTable({ bySymbol }: ResultsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(symbol: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  if (bySymbol.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        此期間無已實現損益紀錄
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            <th className="text-left py-2.5 px-3 w-6"></th>
            <th className="text-left py-2.5 px-3">代號</th>
            <th className="text-right py-2.5 px-3 hidden md:table-cell">次數</th>
            <th className="text-right py-2.5 px-3 hidden lg:table-cell">買入成本</th>
            <th className="text-right py-2.5 px-3">已實現損益</th>
            <th className="text-right py-2.5 px-3 hidden sm:table-cell">報酬率</th>
            <th className="text-right py-2.5 px-3 hidden md:table-cell">勝/敗</th>
            <th className="text-right py-2.5 px-3 hidden lg:table-cell">最後交易</th>
          </tr>
        </thead>
        <tbody>
          {bySymbol.map((row) => {
            const isOpen = expanded.has(row.symbol);
            const pnlColor =
              row.totalRealizedPnL > 0
                ? "text-green-600 dark:text-green-400"
                : row.totalRealizedPnL < 0
                ? "text-red-600 dark:text-red-400"
                : "";

            return (
              <>
                <tr
                  key={row.symbol}
                  className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => toggle(row.symbol)}
                >
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium">{row.symbol}</div>
                    {row.symbolName && (
                      <div className="text-xs text-muted-foreground">{row.symbolName}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right hidden md:table-cell tabular-nums">
                    {row.tradeCount}
                  </td>
                  <td className="py-2.5 px-3 text-right hidden lg:table-cell tabular-nums text-muted-foreground">
                    {formatTWD(row.totalBuyCost)}
                  </td>
                  <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${pnlColor}`}>
                    {formatTWD(row.totalRealizedPnL, true)}
                  </td>
                  <td className={`py-2.5 px-3 text-right hidden sm:table-cell tabular-nums ${pnlColor}`}>
                    {formatPct(row.realizedPnLPct)}
                  </td>
                  <td className="py-2.5 px-3 text-right hidden md:table-cell">
                    <span className="text-green-600 dark:text-green-400">{row.winCount}勝</span>
                    <span className="text-muted-foreground mx-0.5">/</span>
                    <span className="text-red-600 dark:text-red-400">{row.lossCount}敗</span>
                  </td>
                  <td className="py-2.5 px-3 text-right hidden lg:table-cell text-muted-foreground">
                    {formatDate(row.lastTradeDate)}
                  </td>
                </tr>

                {isOpen && (
                  <tr key={`${row.symbol}-detail`} className="bg-muted/20">
                    <td colSpan={8} className="px-0 py-0">
                      <ExpandedTrades trades={row.trades} />
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

function ExpandedTrades({ trades }: { trades: SellTradeDetail[] }) {
  return (
    <div className="pl-10 pr-3 py-2 border-b">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left py-1.5 px-2">交易日期</th>
            <th className="text-right py-1.5 px-2">股數</th>
            <th className="text-right py-1.5 px-2">賣出均價</th>
            <th className="text-right py-1.5 px-2 hidden sm:table-cell">買入成本</th>
            <th className="text-right py-1.5 px-2">已實現損益</th>
            <th className="text-right py-1.5 px-2 hidden sm:table-cell">報酬率</th>
            <th className="text-left py-1.5 px-2 hidden md:table-cell">備註</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const pnlColor =
              t.realizedPnL > 0
                ? "text-green-600 dark:text-green-400"
                : t.realizedPnL < 0
                ? "text-red-600 dark:text-red-400"
                : "";
            const sharesLabel =
              t.lotType === "ROUND"
                ? `${t.shares / 1000} 張`
                : `${t.shares} 股`;

            return (
              <tr key={t.id} className="border-t border-border/50">
                <td className="py-1.5 px-2 text-muted-foreground">
                  {formatDate(t.tradeDate)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">{sharesLabel}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{t.price.toFixed(2)}</td>
                <td className="py-1.5 px-2 text-right hidden sm:table-cell tabular-nums text-muted-foreground">
                  {formatTWD(t.buyCost)}
                </td>
                <td className={`py-1.5 px-2 text-right tabular-nums font-medium ${pnlColor}`}>
                  {formatTWD(t.realizedPnL, true)}
                </td>
                <td className={`py-1.5 px-2 text-right hidden sm:table-cell tabular-nums ${pnlColor}`}>
                  {formatPct(t.realizedPnLPct)}
                </td>
                <td className="py-1.5 px-2 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">
                  {t.notes ?? "—"}
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
  // Flatten all trades, sort by date desc
  const allTrades = bySymbol
    .flatMap((s) =>
      s.trades.map((t) => ({
        ...t,
        symbol: s.symbol,
        symbolName: s.symbolName,
      }))
    )
    .sort((a, b) => (b.tradeDate > a.tradeDate ? 1 : -1));

  if (allTrades.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        此期間無已實現損益紀錄
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            <th className="text-left py-2.5 px-3">日期</th>
            <th className="text-left py-2.5 px-3">代號</th>
            <th className="text-right py-2.5 px-3">股數</th>
            <th className="text-right py-2.5 px-3 hidden sm:table-cell">賣出價</th>
            <th className="text-right py-2.5 px-3 hidden md:table-cell">買入成本</th>
            <th className="text-right py-2.5 px-3">已實現損益</th>
            <th className="text-right py-2.5 px-3 hidden sm:table-cell">報酬率</th>
          </tr>
        </thead>
        <tbody>
          {allTrades.map((t) => {
            const pnlColor =
              t.realizedPnL > 0
                ? "text-green-600 dark:text-green-400"
                : t.realizedPnL < 0
                ? "text-red-600 dark:text-red-400"
                : "";
            const sharesLabel =
              t.lotType === "ROUND"
                ? `${t.shares / 1000} 張`
                : `${t.shares} 股`;

            return (
              <tr key={t.id} className="border-b hover:bg-muted/40 transition-colors">
                <td className="py-2.5 px-3 text-muted-foreground">
                  {formatDate(t.tradeDate)}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-medium">{t.symbol}</div>
                  {t.symbolName && (
                    <div className="text-xs text-muted-foreground">{t.symbolName}</div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">{sharesLabel}</td>
                <td className="py-2.5 px-3 text-right hidden sm:table-cell tabular-nums">
                  {t.price.toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right hidden md:table-cell tabular-nums text-muted-foreground">
                  {formatTWD(t.buyCost)}
                </td>
                <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${pnlColor}`}>
                  {formatTWD(t.realizedPnL, true)}
                </td>
                <td className={`py-2.5 px-3 text-right hidden sm:table-cell tabular-nums ${pnlColor}`}>
                  {formatPct(t.realizedPnLPct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Badge helper (re-exported for page use)
export function PnLBadge({ value }: { value: number }) {
  if (value > 0)
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        獲利
      </Badge>
    );
  if (value < 0)
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        虧損
      </Badge>
    );
  return <Badge variant="secondary">持平</Badge>;
}
