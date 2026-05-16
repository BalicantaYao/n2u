import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import type {
  TradingResultsData,
  MarketSummary,
  SymbolResult,
  SellTradeDetail,
} from "@/types/trade";
import type { Currency, Market, LotType } from "@/types/taiwan";
import { marketToCurrency } from "@/types/taiwan";

export const dynamic = "force-dynamic";

const EPSILON = 1e-9;

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  // Fetch ALL trades (BUY and SELL) for FIFO replay; date filter only applies
  // to which SELL trades are displayed, since old BUYs can match new SELLs.
  const trades = await prisma.trade.findMany({
    where: { userId: auth.userId },
    orderBy: [
      { tradeDate: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      symbol: true,
      symbolName: true,
      market: true,
      currency: true,
      side: true,
      tradeDate: true,
      lotType: true,
      shares: true,
      price: true,
      netAmount: true,
      realizedPnL: true,
      commission: true,
      transactionTax: true,
      notes: true,
    },
  });

  // Group trades by symbol; trades are already in chronological order.
  const tradesBySymbol = new Map<string, typeof trades>();
  for (const t of trades) {
    const list = tradesBySymbol.get(t.symbol);
    if (list) list.push(t);
    else tradesBySymbol.set(t.symbol, [t]);
  }

  type ReplayLot = {
    currency: string;
    openDate: Date;
    remainingShares: number;
    costPerShare: number;
    grossPrice: number;
  };

  type SellMatch = {
    buyCost: number;
    buyAvgPrice: number;
    buyDate?: Date;
    buyDateEnd?: Date;
  };

  // For each SELL trade id, the FIFO-matched buy info.
  const matchBySellId = new Map<string, SellMatch>();

  for (const symbolTrades of tradesBySymbol.values()) {
    const lots: ReplayLot[] = [];

    for (const t of symbolTrades) {
      if (t.side === "BUY") {
        lots.push({
          currency: t.currency,
          openDate: t.tradeDate,
          remainingShares: t.shares,
          costPerShare: t.shares > 0 ? t.netAmount / t.shares : 0,
          grossPrice: t.price,
        });
        continue;
      }
      if (t.side !== "SELL") continue;

      let remaining = t.shares;
      let totalBuyCost = 0;
      let totalGrossBuy = 0;
      let earliest: Date | null = null;
      let latest: Date | null = null;

      for (const lot of lots) {
        if (remaining <= EPSILON) break;
        if (lot.remainingShares <= EPSILON) continue;
        if (lot.currency !== t.currency) continue;
        const consume = Math.min(lot.remainingShares, remaining);
        totalBuyCost += consume * lot.costPerShare;
        totalGrossBuy += consume * lot.grossPrice;
        if (!earliest || lot.openDate < earliest) earliest = lot.openDate;
        if (!latest || lot.openDate > latest) latest = lot.openDate;
        lot.remainingShares -= consume;
        remaining -= consume;
      }

      const consumed = t.shares - remaining;
      matchBySellId.set(t.id, {
        buyCost: totalBuyCost,
        buyAvgPrice: consumed > EPSILON ? totalGrossBuy / consumed : 0,
        buyDate: earliest ?? undefined,
        buyDateEnd:
          latest && earliest && latest.getTime() !== earliest.getTime()
            ? latest
            : undefined,
      });
    }
  }

  // Build per-symbol groups (filtered SELLs only)
  const symbolMap = new Map<string, {
    symbol: string;
    symbolName?: string;
    market: Market;
    trades: SellTradeDetail[];
  }>();

  function emptySummary(): MarketSummary {
    return {
      totalRealized: 0,
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      totalCommission: 0,
      totalTransactionTax: 0,
    };
  }

  const byCurrency: Record<Currency, MarketSummary> = {
    TWD: emptySummary(),
    USD: emptySummary(),
  };

  let totalRealized = 0;
  let winCount = 0;
  let lossCount = 0;
  let totalCommission = 0;
  let totalTransactionTax = 0;
  let totalTrades = 0;

  for (const t of trades) {
    if (t.side !== "SELL" || t.realizedPnL == null) continue;
    if (fromDate && t.tradeDate < fromDate) continue;
    if (toDate && t.tradeDate > toDate) continue;

    const pnl = t.realizedPnL;
    const match = matchBySellId.get(t.id);
    const buyCost = match?.buyCost ?? t.netAmount - pnl;
    const buyAvgPrice = match?.buyAvgPrice ?? 0;
    const pnlPct = buyCost > 0 ? pnl / buyCost : 0;
    const currency = marketToCurrency(t.market as Market);
    const cs = byCurrency[currency];

    totalTrades++;
    totalRealized += pnl;
    totalCommission += t.commission;
    totalTransactionTax += t.transactionTax;
    cs.totalRealized += pnl;
    cs.totalCommission += t.commission;
    cs.totalTransactionTax += t.transactionTax;
    cs.totalTrades += 1;
    if (pnl > 0) {
      winCount++;
      cs.winCount += 1;
    } else if (pnl < 0) {
      lossCount++;
      cs.lossCount += 1;
    }

    const detail: SellTradeDetail = {
      id: t.id,
      tradeDate: t.tradeDate.toISOString(),
      shares: t.shares,
      lotType: t.lotType as LotType,
      price: t.price,
      netAmount: t.netAmount,
      buyCost,
      buyAvgPrice,
      buyDate: match?.buyDate?.toISOString(),
      buyDateEnd: match?.buyDateEnd?.toISOString(),
      realizedPnL: pnl,
      realizedPnLPct: pnlPct,
      notes: t.notes ?? undefined,
    };

    const existing = symbolMap.get(t.symbol);
    if (existing) {
      existing.trades.push(detail);
    } else {
      symbolMap.set(t.symbol, {
        symbol: t.symbol,
        symbolName: t.symbolName ?? undefined,
        market: t.market as Market,
        trades: [detail],
      });
    }
  }

  const winRate = totalTrades > 0 ? winCount / totalTrades : 0;

  for (const c of Object.keys(byCurrency) as Currency[]) {
    const cs = byCurrency[c];
    cs.winRate = cs.totalTrades > 0 ? cs.winCount / cs.totalTrades : 0;
  }

  // Build bySymbol array
  const bySymbol: SymbolResult[] = Array.from(symbolMap.values()).map((g) => {
    let totalRealizedPnL = 0;
    let totalBuyCost = 0;
    let totalShares = 0;
    let symWin = 0;
    let symLoss = 0;
    let lastTradeDate = "";

    for (const t of g.trades) {
      totalRealizedPnL += t.realizedPnL;
      totalBuyCost += t.buyCost;
      totalShares += t.shares;
      if (t.realizedPnL > 0) symWin++;
      else if (t.realizedPnL < 0) symLoss++;
      if (!lastTradeDate || t.tradeDate > lastTradeDate) {
        lastTradeDate = t.tradeDate;
      }
    }

    return {
      symbol: g.symbol,
      symbolName: g.symbolName,
      market: g.market,
      currency: marketToCurrency(g.market),
      tradeCount: g.trades.length,
      totalShares,
      totalRealizedPnL,
      totalBuyCost,
      realizedPnLPct: totalBuyCost > 0 ? totalRealizedPnL / totalBuyCost : 0,
      winCount: symWin,
      lossCount: symLoss,
      lastTradeDate,
      trades: g.trades,
    };
  });

  // Sort by absolute P&L desc (biggest winner/loser first), then by totalRealizedPnL desc
  bySymbol.sort((a, b) => b.totalRealizedPnL - a.totalRealizedPnL);

  const data: TradingResultsData = {
    summary: {
      totalRealized,
      totalTrades,
      winCount,
      lossCount,
      winRate,
      totalCommission,
      totalTransactionTax,
    },
    summaryByCurrency: byCurrency,
    bySymbol,
  };

  return NextResponse.json(data);
}
