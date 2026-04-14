import { Badge } from "@/components/ui/badge";
import { formatTWD, formatDate, formatShares } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Trade } from "@/types/trade";

export function RecentTrades({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        尚無交易記錄。<a href="/journal/new" className="text-primary underline">新增第一筆</a>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">日期</th>
            <th className="text-left py-2 pr-4 font-medium">代號</th>
            <th className="text-left py-2 pr-4 font-medium">方向</th>
            <th className="text-right py-2 pr-4 font-medium">數量</th>
            <th className="text-right py-2 pr-4 font-medium">均價</th>
            <th className="text-right py-2 font-medium">損益</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-2.5 pr-4 text-muted-foreground">
                {formatDate(t.tradeDate)}
              </td>
              <td className="py-2.5 pr-4">
                <span className="font-medium">{t.symbol}</span>
                {t.symbolName && (
                  <span className="text-muted-foreground ml-1.5 text-xs">{t.symbolName}</span>
                )}
              </td>
              <td className="py-2.5 pr-4">
                <Badge variant={t.side === "BUY" ? "default" : "outline"} className="text-xs">
                  {t.side === "BUY" ? "買進" : "賣出"}
                </Badge>
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {formatShares(t.shares, t.lotType as "ROUND" | "ODD")}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {t.price.toLocaleString()}
              </td>
              <td className={cn(
                "py-2.5 text-right tabular-nums font-medium",
                t.realizedPnL != null && t.realizedPnL > 0 && "text-green-600 dark:text-green-400",
                t.realizedPnL != null && t.realizedPnL < 0 && "text-red-600 dark:text-red-400"
              )}>
                {t.realizedPnL != null
                  ? formatTWD(t.realizedPnL, true)
                  : <span className="text-muted-foreground">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
