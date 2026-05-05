/**
 * 損益計算引擎（FIFO 配對）
 *
 * 採重算（recompute）策略：每當該 symbol 的任何 trade 變動（新增/編輯/刪除）後，
 * 呼叫 recomputeSymbolPnL 將該 user × symbol 的所有 PositionLot 重建並回寫每筆 SELL 的 realizedPnL。
 */

import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchQuotes } from "@/lib/market-api";

import type { PnLSummary } from "@/types/trade";
import type { Currency, Market } from "@/types/taiwan";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">;

const EPSILON = 1e-9;

/**
 * 重算指定使用者 × symbol 的 FIFO 部位與已實現損益。
 * 必須在 DB transaction 內呼叫，並傳入該 transaction client。
 *
 * 策略：刪除該 user × symbol 所有 PositionLot，依 (tradeDate, createdAt, id) 順序
 * 重新 replay 所有 trade，重建 lots 並寫回每筆 SELL 的 realizedPnL。
 * FIFO 比對時以 currency 區隔，避免跨幣別混配。
 */
export async function recomputeSymbolPnL(
  tx: TxClient,
  userId: string,
  symbol: string,
): Promise<void> {
  const upper = symbol.toUpperCase();

  const trades = await tx.trade.findMany({
    where: { userId, symbol: upper },
    orderBy: [
      { tradeDate: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  await tx.positionLot.deleteMany({ where: { userId, symbol: upper } });

  type ReplayLot = {
    tradeId: string;
    market: string;
    currency: string;
    lotType: string;
    openDate: Date;
    remainingShares: number;
    costPerShare: number;
  };

  const lots: ReplayLot[] = [];

  for (const t of trades) {
    if (t.side === "BUY") {
      lots.push({
        tradeId: t.id,
        market: t.market,
        currency: t.currency,
        lotType: t.lotType,
        openDate: t.tradeDate,
        remainingShares: t.shares,
        costPerShare: t.shares > 0 ? t.netAmount / t.shares : 0,
      });
      continue;
    }

    if (t.side !== "SELL") continue;

    let remaining = t.shares;
    let totalBuyCost = 0;
    for (const lot of lots) {
      if (remaining <= EPSILON) break;
      if (lot.remainingShares <= EPSILON) continue;
      if (lot.currency !== t.currency) continue;
      const consume = Math.min(lot.remainingShares, remaining);
      totalBuyCost += consume * lot.costPerShare;
      lot.remainingShares -= consume;
      remaining -= consume;
    }

    const sold = t.shares - remaining;
    const netProceedsForSold =
      sold > EPSILON && t.shares > 0 ? (t.netAmount / t.shares) * sold : 0;
    const realizedPnL = netProceedsForSold - totalBuyCost;

    await tx.trade.update({
      where: { id: t.id },
      data: { realizedPnL },
    });
  }

  for (const lot of lots) {
    const isOpen = lot.remainingShares > EPSILON;
    await tx.positionLot.create({
      data: {
        symbol: upper,
        market: lot.market,
        currency: lot.currency,
        lotType: lot.lotType,
        openTradeId: lot.tradeId,
        openDate: lot.openDate,
        shares: isOpen ? lot.remainingShares : 0,
        costPerShare: lot.costPerShare,
        isOpen,
        userId,
      },
    });
  }
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
