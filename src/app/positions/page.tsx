import { PositionsContent } from "@/components/positions/PositionsContent";
import { prisma } from "@/lib/prisma";
import { fetchQuotes, fetchHistorical } from "@/lib/yahoo-finance";
import { calculateMA } from "@/lib/stop-loss-calculator";
import type { Market } from "@/types/taiwan";
import type { Position } from "@/types/trade";
import type { OHLCVBar } from "@/types/market";

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

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 25);
  const toDate = new Date();
  const historicalBars: Record<string, OHLCVBar[]> = {};

  const [quotes] = await Promise.all([
    symbols.length > 0 ? fetchQuotes(symbols) : Promise.resolve({} as Record<string, import("@/types/market").Quote>),
    Promise.allSettled(
      symbols.map(async ({ symbol, market }) => {
        const bars = await fetchHistorical(symbol, market, fromDate, toDate, "1d");
        if (bars.length > 0) historicalBars[symbol] = bars;
      })
    ),
  ]);

  return Array.from(map.values()).map((p) => {
    const avgCostPerShare = p.totalShares > 0 ? p.totalCost / p.totalShares : 0;
    const quote = quotes[p.symbol];
    const currentPrice = quote?.price;
    const marketValue = currentPrice != null ? currentPrice * p.totalShares : undefined;
    const unrealizedPnL = marketValue != null ? marketValue - p.totalCost : undefined;
    const unrealizedPnLPct =
      unrealizedPnL != null && p.totalCost > 0 ? unrealizedPnL / p.totalCost : undefined;

    const bars = historicalBars[p.symbol];
    const ma5 = bars ? calculateMA(bars, 5) ?? undefined : undefined;
    const ma10 = bars ? calculateMA(bars, 10) ?? undefined : undefined;

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
      ma5,
      ma10,
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
    <PositionsContent
      positions={positions}
      totalCost={totalCost}
      totalMarketValue={totalMarketValue}
      totalUnrealized={totalUnrealized}
      overallReturn={overallReturn}
      hasQuotes={hasQuotes}
    />
  );
}
