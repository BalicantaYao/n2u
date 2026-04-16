import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { PositionsTable } from "@/components/positions/PositionsTable";
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
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getOpenPositions(): Promise<Position[]> {
  const lots = await prisma.positionLot.findMany({
    where: { isOpen: true },
    include: { openTrade: { select: { stopLoss: true, takeProfit: true, symbolName: true, notes: true } } },
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
      notes: string[];
    }
  >();

  for (const lot of lots) {
    const existing = map.get(lot.symbol);
    if (existing) {
      existing.totalShares += lot.shares;
      existing.totalCost += lot.shares * lot.costPerShare;
      if (lot.openTrade.stopLoss != null) existing.stopLoss = lot.openTrade.stopLoss;
      if (lot.openTrade.takeProfit != null) existing.takeProfit = lot.openTrade.takeProfit;
      if (lot.openTrade.notes && !existing.notes.includes(lot.openTrade.notes)) {
        existing.notes.push(lot.openTrade.notes);
      }
    } else {
      map.set(lot.symbol, {
        symbol: lot.symbol,
        market: lot.market as Market,
        symbolName: lot.openTrade.symbolName ?? undefined,
        totalShares: lot.shares,
        totalCost: lot.shares * lot.costPerShare,
        stopLoss: lot.openTrade.stopLoss ?? undefined,
        takeProfit: lot.openTrade.takeProfit ?? undefined,
        notes: lot.openTrade.notes ? [lot.openTrade.notes] : [],
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
      notes: p.notes,
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
        <PositionsTable positions={positions} />
      </div>
    </div>
  );
}
