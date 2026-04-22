import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { fetchQuotes } from "@/lib/market-api";
import { marketToCurrency } from "@/types/taiwan";
import type { Currency, Market } from "@/types/taiwan";
import type { Position } from "@/types/trade";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const lots = await prisma.positionLot.findMany({
    where: { isOpen: true, userId: auth.userId },
    include: { openTrade: { select: { stopLoss: true, symbolName: true, notes: true, isETF: true } } },
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
      notes: string[];
      earliestOpenDate: Date;
    }
  >();

  for (const lot of lots) {
    const existing = map.get(lot.symbol);
    if (existing) {
      existing.totalShares += lot.shares;
      existing.totalCost += lot.shares * lot.costPerShare;
      if (lot.openTrade.isETF) existing.isETF = true;
      // invariant: 同 symbol 所有開倉中 BUY trades 的 stopLoss 會在寫入時同步（PUT /api/trades/[id]），
      // 所以這裡取「最後一筆非空值」的結果對所有進場筆都一致。
      if (lot.openTrade.stopLoss != null) existing.stopLoss = lot.openTrade.stopLoss;
      if (lot.openTrade.notes && !existing.notes.includes(lot.openTrade.notes)) {
        existing.notes.push(lot.openTrade.notes);
      }
      if (lot.openDate < existing.earliestOpenDate) {
        existing.earliestOpenDate = lot.openDate;
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
        notes: lot.openTrade.notes ? [lot.openTrade.notes] : [],
        earliestOpenDate: lot.openDate,
      });
    }
  }

  const symbols = Array.from(map.values()).map((p) => ({
    symbol: p.symbol,
    market: p.market,
  }));

  const symbolKeys = Array.from(map.keys());
  const globalEarliestOpenDate = Array.from(map.values()).reduce<Date | undefined>(
    (acc, p) => (acc == null || p.earliestOpenDate < acc ? p.earliestOpenDate : acc),
    undefined,
  );

  const [quotes, sellTrades] = await Promise.all([
    symbols.length > 0 ? fetchQuotes(symbols) : Promise.resolve({} as Awaited<ReturnType<typeof fetchQuotes>>),
    symbolKeys.length > 0
      ? prisma.trade.findMany({
          where: {
            userId: auth.userId,
            side: "SELL",
            realizedPnL: { not: null },
            symbol: { in: symbolKeys },
            ...(globalEarliestOpenDate ? { tradeDate: { gte: globalEarliestOpenDate } } : {}),
          },
          select: { symbol: true, tradeDate: true, realizedPnL: true },
        })
      : Promise.resolve([] as Array<{ symbol: string; tradeDate: Date; realizedPnL: number | null }>),
  ]);

  const realizedBySymbol = new Map<string, number>();
  for (const t of sellTrades) {
    const entry = map.get(t.symbol);
    if (!entry) continue;
    if (t.tradeDate >= entry.earliestOpenDate) {
      realizedBySymbol.set(t.symbol, (realizedBySymbol.get(t.symbol) ?? 0) + (t.realizedPnL ?? 0));
    }
  }

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
    const realizedPnL = realizedBySymbol.get(p.symbol) ?? 0;
    const totalPnLPct =
      unrealizedPnL != null && p.totalCost > 0
        ? (unrealizedPnL + realizedPnL) / p.totalCost
        : undefined;
    const pnlAtStopLoss =
      p.stopLoss != null ? p.stopLoss * p.totalShares - p.totalCost : undefined;
    const pnlAtStopLossPct =
      pnlAtStopLoss != null && p.totalCost > 0
        ? pnlAtStopLoss / p.totalCost
        : undefined;

    return {
      symbol: p.symbol,
      symbolName: p.symbolName ?? quote?.symbolName,
      market: p.market,
      currency: marketToCurrency(p.market) as Currency,
      isETF: p.isETF,
      totalShares: p.totalShares,
      avgCostPerShare,
      totalCost: p.totalCost,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPct,
      realizedPnL,
      totalPnLPct,
      stopLoss: p.stopLoss,
      pnlAtStopLoss,
      pnlAtStopLossPct,
      isStopLossAlert:
        currentPrice != null && p.stopLoss != null
          ? currentPrice <= p.stopLoss
          : false,
      notes: p.notes,
    };
  });

  return NextResponse.json(positions);
}
