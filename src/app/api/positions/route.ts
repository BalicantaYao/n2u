import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { fetchQuotes } from "@/lib/fugle-api";
import type { Market } from "@/types/taiwan";
import type { Position } from "@/types/trade";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const lots = await prisma.positionLot.findMany({
    where: { isOpen: true, userId: auth.userId },
    include: { openTrade: { select: { stopLoss: true, takeProfit: true, symbolName: true, notes: true, isETF: true } } },
  });

  // group by symbol
  const map = new Map<
    string,
    {
      symbol: string;
      market: Market;
      symbolName?: string;
      isETF?: boolean;
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
      if (lot.openTrade.isETF) existing.isETF = true;
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
        isETF: lot.openTrade.isETF,
        totalShares: lot.shares,
        totalCost: lot.shares * lot.costPerShare,
        stopLoss: lot.openTrade.stopLoss ?? undefined,
        takeProfit: lot.openTrade.takeProfit ?? undefined,
        notes: lot.openTrade.notes ? [lot.openTrade.notes] : [],
      });
    }
  }

  const symbols = Array.from(map.values()).map((p) => ({
    symbol: p.symbol,
    market: p.market,
  }));

  const quotes = symbols.length > 0 ? await fetchQuotes(symbols) : {};

  const positions: Position[] = Array.from(map.values()).map((p) => {
    const avgCostPerShare = p.totalShares > 0 ? p.totalCost / p.totalShares : 0;
    const quote = quotes[p.symbol];
    const currentPrice = quote?.price;
    const marketValue = currentPrice != null ? currentPrice * p.totalShares : undefined;
    const unrealizedPnL =
      marketValue != null ? marketValue - p.totalCost : undefined;
    const unrealizedPnLPct =
      unrealizedPnL != null && p.totalCost > 0
        ? unrealizedPnL / p.totalCost
        : undefined;

    return {
      symbol: p.symbol,
      symbolName: p.symbolName ?? quote?.symbolName,
      market: p.market,
      isETF: p.isETF,
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
        currentPrice != null && p.stopLoss != null
          ? currentPrice <= p.stopLoss
          : false,
      isTakeProfitAlert:
        currentPrice != null && p.takeProfit != null
          ? currentPrice >= p.takeProfit
          : false,
      notes: p.notes,
    };
  });

  return NextResponse.json(positions);
}
