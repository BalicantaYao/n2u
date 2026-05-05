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

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {
    side: "SELL",
    realizedPnL: { not: null },
    userId: auth.userId,
  };

  if (from || to) {
    where.tradeDate = {};
    if (from) (where.tradeDate as Record<string, unknown>).gte = new Date(from);
    if (to) (where.tradeDate as Record<string, unknown>).lte = new Date(to);
  }

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeDate: "desc" },
    select: {
      id: true,
      symbol: true,
      symbolName: true,
      market: true,
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

  // Build per-symbol groups
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

  for (const t of trades) {
    const pnl = t.realizedPnL ?? 0;
    const buyCost = t.netAmount - pnl;
    const pnlPct = buyCost > 0 ? pnl / buyCost : 0;
    const currency = marketToCurrency(t.market as Market);
    const cs = byCurrency[currency];

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

  const totalTrades = trades.length;
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

    // trades are already desc by tradeDate; sort asc for display in expanded view
    const tradesAsc = [...g.trades].reverse();

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
      trades: tradesAsc,
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
