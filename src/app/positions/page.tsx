import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { fetchQuotes } from "@/lib/yahoo-finance";
import { formatTWD, formatPct } from "@/lib/utils";
import type { Market } from "@/types/taiwan";
import type { Position } from "@/types/trade";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Banknote,
  Percent,
  AlertTriangle,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getOpenPositions(): Promise<Position[]> {
  const lots = await prisma.positionLot.findMany({
    where: { isOpen: true },
    include: { openTrade: { select: { stopLoss: true, takeProfit: true, symbolName: true } } },
  });

  const map = new Map<
    string,
    {
      symbol: string;
      market: Market;
      symbolName?: string;
      totalShares: number;
      totalCost: number;
      stopLoss?: number;
      takeProfit?: number;
    }
  >();

  for (const lot of lots) {
    const existing = map.get(lot.symbol);
    if (existing) {
      existing.totalShares += lot.shares;
      existing.totalCost += lot.shares * lot.costPerShare;
      if (lot.openTrade.stopLoss != null) existing.stopLoss = lot.openTrade.stopLoss;
      if (lot.openTrade.takeProfit != null) existing.takeProfit = lot.openTrade.takeProfit;
    } else {
      map.set(lot.symbol, {
        symbol: lot.symbol,
        market: lot.market as Market,
        symbolName: lot.openTrade.symbolName ?? undefined,
        totalShares: lot.shares,
        totalCost: lot.shares * lot.costPerShare,
        stopLoss: lot.openTrade.stopLoss ?? undefined,
        takeProfit: lot.openTrade.takeProfit ?? undefined,
      });
    }
  }

  const symbols = Array.from(map.values()).map((p) => ({ symbol: p.symbol, market: p.market }));
  const quotes = symbols.length > 0 ? await fetchQuotes(symbols) : {};

  return Array.from(map.values()).map((p) => {
    const avgCostPerShare = p.totalShares > 0 ? p.totalCost / p.totalShares : 0;
    const quote = quotes[p.symbol];
    const currentPrice = quote?.price;
    const marketValue = currentPrice != null ? currentPrice * p.totalShares : undefined;
    const unrealizedPnL = marketValue != null ? marketValue - p.totalCost : undefined;
    const unrealizedPnLPct =
      unrealizedPnL != null && p.totalCost > 0 ? unrealizedPnL / p.totalCost : undefined;

    return {
      symbol: p.symbol,
      symbolName: p.symbolName ?? quote?.symbolName,
      market: p.market,
      totalShares: p.totalShares,
      avgCostPerShare,
      totalCost: p.totalCost,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPct,
      stopLoss: p.stopLoss,
      takeProfit: p.takeProfit,
      isStopLossAlert:
        currentPrice != null && p.stopLoss != null ? currentPrice <= p.stopLoss : false,
      isTakeProfitAlert:
        currentPrice != null && p.takeProfit != null ? currentPrice >= p.takeProfit : false,
    };
  });
}

export default async function PositionsPage() {
  const positions = await getOpenPositions();

  const totalCost = positions.reduce((s, p) => s + p.totalCost, 0);
  const totalMarketValue = positions.reduce(
    (s, p) => s + (p.marketValue ?? p.totalCost),
    0
  );
  const totalUnrealized = positions.reduce((s, p) => s + (p.unrealizedPnL ?? 0), 0);
  const overallReturn = totalCost > 0 ? totalUnrealized / totalCost : 0;
  const hasQuotes = positions.some((p) => p.currentPrice != null);

  return (
    <div>
      <Header title="持倉分析" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="持倉檔數"
            value={`${positions.length} 檔`}
            icon={Briefcase}
            trend="neutral"
          />
          <StatCard
            title="投入成本"
            value={formatTWD(totalCost)}
            icon={Banknote}
            trend="neutral"
          />
          <StatCard
            title="目前市值"
            value={hasQuotes ? formatTWD(totalMarketValue) : "—"}
            icon={TrendingUp}
            trend="neutral"
          />
          <StatCard
            title="未實現損益"
            value={hasQuotes ? formatTWD(totalUnrealized, true) : "—"}
            icon={totalUnrealized >= 0 ? TrendingUp : TrendingDown}
            trend={
              !hasQuotes ? "neutral" : totalUnrealized > 0 ? "positive" : totalUnrealized < 0 ? "negative" : "neutral"
            }
          />
          <StatCard
            title="整體報酬率"
            value={hasQuotes ? formatPct(overallReturn) : "—"}
            icon={Percent}
            trend={
              !hasQuotes ? "neutral" : overallReturn > 0 ? "positive" : overallReturn < 0 ? "negative" : "neutral"
            }
          />
        </div>

        {/* Positions Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">持倉明細</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Briefcase className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">目前無持倉</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">股票</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">股數</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">成本均價</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">現價</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">投入成本</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">市值</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">未實現損益</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">報酬率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => {
                      const pnlPositive = (pos.unrealizedPnL ?? 0) >= 0;
                      return (
                        <tr key={pos.symbol} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          {/* Stock */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold tabular-nums">{pos.symbol}</span>
                                  {pos.isStopLossAlert && (
                                    <span title="觸及停損">
                                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                    </span>
                                  )}
                                  {pos.isTakeProfitAlert && (
                                    <span title="觸及停利">
                                      <Target className="h-3.5 w-3.5 text-green-500" />
                                    </span>
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
                            {pos.totalShares >= 1000
                              ? `${pos.totalShares / 1000} 張`
                              : `${pos.totalShares} 股`}
                          </td>

                          {/* Avg Cost */}
                          <td className="px-4 py-3 text-right tabular-nums">
                            {pos.avgCostPerShare.toFixed(2)}
                          </td>

                          {/* Current Price */}
                          <td className="px-4 py-3 text-right tabular-nums">
                            {pos.currentPrice != null ? pos.currentPrice.toFixed(2) : "—"}
                          </td>

                          {/* Total Cost */}
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatTWD(pos.totalCost)}
                          </td>

                          {/* Market Value */}
                          <td className="px-4 py-3 text-right tabular-nums">
                            {pos.marketValue != null ? formatTWD(pos.marketValue) : "—"}
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
                              ? formatTWD(pos.unrealizedPnL, true)
                              : "—"}
                          </td>

                          {/* Return % */}
                          <td
                            className={cn(
                              "px-4 py-3 text-right tabular-nums font-medium",
                              pos.unrealizedPnLPct == null
                                ? "text-muted-foreground"
                                : pnlPositive
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            )}
                          >
                            {pos.unrealizedPnLPct != null
                              ? formatPct(pos.unrealizedPnLPct)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
