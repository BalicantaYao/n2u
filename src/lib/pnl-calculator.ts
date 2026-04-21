/**
 * 損益計算引擎（FIFO 配對）
 *
 * 賣出時按 FIFO 順序消耗持倉，計算已實現損益。
 */

import { prisma } from "@/lib/prisma";
import { fetchQuotes } from "@/lib/market-api";

import type { PnLSummary } from "@/types/trade";
import type { Currency, Market } from "@/types/taiwan";

/**
 * 賣出時執行 FIFO 配對，回傳該筆賣出的已實現損益。
 * 此函式應在 DB transaction 內呼叫。
 */
export async function matchSellFIFO(params: {
  tradeId: string;
  symbol: string;
  shares: number;
  netSellProceeds: number;
  userId?: string;
}): Promise<number> {
  const { symbol, shares: sellShares, netSellProceeds, userId } = params;

  const openLots = await prisma.positionLot.findMany({
    where: { symbol, isOpen: true, ...(userId ? { userId } : {}) },
    orderBy: { openDate: "asc" },
  });

  let remainingShares = sellShares;
  let totalBuyCost = 0;

  for (const lot of openLots) {
    if (remainingShares <= 0) break;

    const consume = Math.min(lot.shares, remainingShares);
    totalBuyCost += consume * lot.costPerShare;
    remainingShares -= consume;

    if (consume >= lot.shares) {
      await prisma.positionLot.update({
        where: { id: lot.id },
        data: { isOpen: false, shares: 0 },
      });
    } else {
      await prisma.positionLot.update({
        where: { id: lot.id },
        data: { shares: lot.shares - consume },
      });
    }
  }

  const soldShares = sellShares - remainingShares;
  const netProceedsForSold =
    soldShares > 0
      ? (netSellProceeds / sellShares) * soldShares
      : 0;

  return netProceedsForSold - totalBuyCost;
}

export async function computePnLSummary(
  userId?: string,
  currency?: Currency,
): Promise<PnLSummary> {
  const userFilter = userId ? { userId } : {};
  const currencyFilter = currency ? { currency } : {};

  const trades = await prisma.trade.findMany({
    where: {
      side: "SELL",
      realizedPnL: { not: null },
      ...userFilter,
      ...currencyFilter,
    },
    select: { realizedPnL: true, commission: true, transactionTax: true },
  });

  const allTrades = await prisma.trade.findMany({
    where: { ...userFilter, ...currencyFilter },
    select: { commission: true, transactionTax: true },
  });

  let totalRealized = 0;
  let winCount = 0;
  let lossCount = 0;
  let totalWin = 0;
  let totalLoss = 0;

  for (const t of trades) {
    const pnl = t.realizedPnL ?? 0;
    totalRealized += pnl;
    if (pnl > 0) {
      winCount++;
      totalWin += pnl;
    } else if (pnl < 0) {
      lossCount++;
      totalLoss += Math.abs(pnl);
    }
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? winCount / totalTrades : 0;
  const avgWin = winCount > 0 ? totalWin / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLoss / lossCount : 0;
  const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;

  let totalCommission = 0;
  let totalTransactionTax = 0;
  for (const t of allTrades) {
    totalCommission += t.commission;
    totalTransactionTax += t.transactionTax;
  }

  // Compute total unrealized P&L from open position lots + live quotes
  const openLots = await prisma.positionLot.findMany({
    where: { isOpen: true, ...userFilter, ...currencyFilter },
    select: { symbol: true, market: true, shares: true, costPerShare: true },
  });

  const posMap = new Map<string, { symbol: string; market: Market; totalShares: number; totalCost: number }>();
  for (const lot of openLots) {
    const existing = posMap.get(lot.symbol);
    if (existing) {
      existing.totalShares += lot.shares;
      existing.totalCost += lot.shares * lot.costPerShare;
    } else {
      posMap.set(lot.symbol, {
        symbol: lot.symbol,
        market: lot.market as Market,
        totalShares: lot.shares,
        totalCost: lot.shares * lot.costPerShare,
      });
    }
  }

  const posSymbols = Array.from(posMap.values()).map((p) => ({ symbol: p.symbol, market: p.market }));
  const quotes = posSymbols.length > 0 ? await fetchQuotes(posSymbols) : {};

  let totalUnrealized = 0;
  for (const pos of posMap.values()) {
    const quote = quotes[pos.symbol];
    if (quote?.price) {
      totalUnrealized += quote.price * pos.totalShares - pos.totalCost;
    }
  }

  return {
    totalRealized,
    totalUnrealized,
    totalTrades,
    winCount,
    lossCount,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    totalCommission,
    totalTransactionTax,
  };
}

export async function getDailyPnL(
  from?: Date,
  to?: Date,
  userId?: string,
  currency?: Currency,
) {
  const where: Record<string, unknown> = {
    side: "SELL",
    realizedPnL: { not: null },
    ...(userId ? { userId } : {}),
    ...(currency ? { currency } : {}),
  };
  if (from || to) {
    where.tradeDate = {};
    if (from) (where.tradeDate as Record<string, unknown>).gte = from;
    if (to) (where.tradeDate as Record<string, unknown>).lte = to;
  }

  const trades = await prisma.trade.findMany({
    where,
    select: { tradeDate: true, realizedPnL: true },
    orderBy: { tradeDate: "asc" },
  });

  // group by date
  const map = new Map<string, number>();
  for (const t of trades) {
    const key = t.tradeDate.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + (t.realizedPnL ?? 0));
  }

  // cumulative
  let cumulative = 0;
  return Array.from(map.entries()).map(([date, daily]) => {
    cumulative += daily;
    return { date, daily, cumulative };
  });
}
