"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPct, formatDate, tradingViewUrl } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { SymbolResult, SellTradeDetail } from "@/types/trade";
import type { Currency } from "@/types/taiwan";

interface ResultsTableProps {
  bySymbol: SymbolResult[];
}

export function ResultsTable({ bySymbol }: ResultsTableProps) {
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
            <th className="text-left py-2.5 px-3 w-6"></th>
            <th className="text-left py-2.5 px-3">{t("results.symbolHeader")}</th>
            <th className="text-right py-2.5 px-3 hidden md:table-cell">{t("results.countHeader")}</th>
            <th className="text-right py-2.5 px-3 hidden lg:table-cell">{t("results.buyCost")}</th>
            <th className="text-right py-2.5 px-3">{t("results.realizedPnLHeader")}</th>
            <th className="text-right py-2.5 px-3 hidden sm:table-cell">{t("results.returnHeader")}</th>
            <th className="text-right py-2.5 px-3 hidden md:table-cell">{t("results.winLossHeader")}</th>
            <th className="text-right py-2.5 px-3 hidden lg:table-cell">{t("results.lastTrade")}</th>
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
                    {row.symbolName && (
                      <div className="text-xs text-muted-foreground">{row.symbolName}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right hidden md:table-cell tabular-nums">
                    {row.tradeCount}
                  </td>
                  <td className="py-2.5 px-3 text-right hidden lg:table-cell tabular-nums text-muted-foreground">
                    {formatCurrency(row.totalBuyCost, row.currency)}
                  </td>
                  <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${pnlColor}`}>
                    {formatCurrency(row.totalRealizedPnL, row.currency, true)}
                  </td>
                  <td className={`py-2.5 px-3 text-right hidden sm:table-cell tabular-nums ${pnlColor}`}>
                    {formatPct(row.realizedPnLPct)}
                  </td>
                  <td className="py-2.5 px-3 text-right hidden md:table-cell">
                    <span className="text-green-600 dark:text-green-400">{t("results.winCount", { count: row.winCount })}</span>
                    <span className="text-muted-foreground mx-0.5">/</span>
                    <span className="text-red-600 dark:text-red-400">{t("results.lossCount", { count: row.lossCount })}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right hidden lg:table-cell text-muted-foreground">
                    {formatDate(row.lastTradeDate)}
                  </td>
                </tr>

                {isOpen && (
                  <tr key={`${row.symbol}-detail`} className="bg-muted/20">
                    <td colSpan={8} className="px-0 py-0">
                      <ExpandedTrades
                        trades={row.trades}
                        currency={row.currency}
                      />
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
            <th className="text-left py-1.5 px-2">{t("results.tradeDate")}</th>
            <th className="text-right py-1.5 px-2">{t("results.sharesHeader")}</th>
            <th className="text-right py-1.5 px-2">{t("results.sellAvgPrice")}</th>
            <th className="text-right py-1.5 px-2 hidden sm:table-cell">{t("results.buyCost")}</th>
            <th className="text-right py-1.5 px-2">{t("results.realizedPnLHeader")}</th>
            <th className="text-right py-1.5 px-2 hidden sm:table-cell">{t("results.returnHeader")}</th>
            <th className="text-left py-1.5 px-2 hidden md:table-cell">{t("common.notes")}</th>
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
                <td className="py-1.5 px-2 text-muted-foreground">
                  {formatDate(tr.tradeDate)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">{sharesLabel}</td>
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
                <td className="py-1.5 px-2 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">
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

  // Flatten all trades, sort by date desc
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            <th className="text-left py-2.5 px-3">{t("common.date")}</th>
            <th className="text-left py-2.5 px-3">{t("results.symbolHeader")}</th>
            <th className="text-right py-2.5 px-3">{t("results.sharesHeader")}</th>
            <th className="text-right py-2.5 px-3 hidden sm:table-cell">{t("results.sellPrice")}</th>
            <th className="text-right py-2.5 px-3 hidden md:table-cell">{t("results.buyCost")}</th>
            <th className="text-right py-2.5 px-3">{t("results.realizedPnLHeader")}</th>
            <th className="text-right py-2.5 px-3 hidden sm:table-cell">{t("results.returnHeader")}</th>
          </tr>
        </thead>
        <tbody>
          {allTrades.map((tr) => {
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

            return (
              <tr key={tr.id} className="border-b hover:bg-muted/40 transition-colors">
                <td className="py-2.5 px-3 text-muted-foreground">
                  {formatDate(tr.tradeDate)}
                </td>
                <td className="py-2.5 px-3">
                  <a
                    href={tradingViewUrl(tr.symbol, tr.market)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-primary hover:underline"
                    title="View on TradingView"
                  >
                    {tr.symbol}
                  </a>
                  {tr.symbolName && (
                    <div className="text-xs text-muted-foreground">{tr.symbolName}</div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">{sharesLabel}</td>
                <td className="py-2.5 px-3 text-right hidden sm:table-cell tabular-nums">
                  {tr.price.toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right hidden md:table-cell tabular-nums text-muted-foreground">
                  {formatCurrency(tr.buyCost, tr.currency)}
                </td>
                <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${pnlColor}`}>
                  {formatCurrency(tr.realizedPnL, tr.currency, true)}
                </td>
                <td className={`py-2.5 px-3 text-right hidden sm:table-cell tabular-nums ${pnlColor}`}>
                  {formatPct(tr.realizedPnLPct)}
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
