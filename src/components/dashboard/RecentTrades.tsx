"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatShares, tradingViewUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Trade } from "@/types/trade";

export function RecentTrades({ trades }: { trades: Trade[] }) {
  const { t } = useT();

  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {t("chart.noRecords")}<a href="/journal/new" className="text-primary underline">{t("chart.addFirst")}</a>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">{t("recentTrades.date")}</th>
            <th className="text-left py-2 pr-4 font-medium">{t("recentTrades.symbol")}</th>
            <th className="text-left py-2 pr-4 font-medium">{t("recentTrades.direction")}</th>
            <th className="text-right py-2 pr-4 font-medium">{t("recentTrades.quantity")}</th>
            <th className="text-right py-2 pr-4 font-medium">{t("recentTrades.avgPrice")}</th>
            <th className="text-right py-2 font-medium">{t("recentTrades.pnl")}</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((tr) => (
            <tr key={tr.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-2.5 pr-4 text-muted-foreground">
                {formatDate(tr.tradeDate)}
              </td>
              <td className="py-2.5 pr-4">
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
                  <span className="text-muted-foreground ml-1.5 text-xs">{tr.symbolName}</span>
                )}
              </td>
              <td className="py-2.5 pr-4">
                <Badge variant={tr.side === "BUY" ? "default" : "outline"} className="text-xs">
                  {tr.side === "BUY" ? t("common.buy") : t("common.sell")}
                </Badge>
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {formatShares(tr.shares, tr.lotType as "ROUND" | "ODD", tr.market)}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {tr.price.toLocaleString()}
              </td>
              <td className={cn(
                "py-2.5 text-right tabular-nums font-medium",
                tr.realizedPnL != null && tr.realizedPnL > 0 && "text-green-600 dark:text-green-400",
                tr.realizedPnL != null && tr.realizedPnL < 0 && "text-red-600 dark:text-red-400"
              )}>
                {tr.realizedPnL != null
                  ? formatCurrency(tr.realizedPnL, tr.currency, true)
                  : <span className="text-muted-foreground">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
