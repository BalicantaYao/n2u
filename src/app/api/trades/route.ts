import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { calculateFees, calcSettlementDate } from "@/lib/fees";
import { lotsToShares } from "@/lib/taiwan-fees";
import { matchSellFIFO } from "@/lib/pnl-calculator";
import { marketToCurrency, isUSMarket } from "@/types/taiwan";
import type { CreateTradeInput } from "@/types/trade";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const where: Record<string, unknown> = { userId: auth.userId };

  const symbol = searchParams.get("symbol");
  const market = searchParams.get("market");
  const side = searchParams.get("side");
  const lotType = searchParams.get("lotType");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (symbol) where.symbol = symbol.toUpperCase();
  if (market) where.market = market;
  if (side) where.side = side;
  if (lotType) where.lotType = lotType;
  if (from || to) {
    where.tradeDate = {};
    if (from) (where.tradeDate as Record<string, unknown>).gte = new Date(from);
    if (to) (where.tradeDate as Record<string, unknown>).lte = new Date(to);
  }

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { tradeDate: "desc" },
  });

  return NextResponse.json(trades);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body: CreateTradeInput = await req.json();

  const {
    symbol,
    symbolName,
    market,
    side,
    tradeDate,
    lotType,
    lots,
    shares: rawShares,
    price,
    commission,
    isETF = false,
    stopLoss,
    notes,
    tags,
  } = body;

  if (!symbol || !market || !side || !tradeDate || !price) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  // 美股強制整股（ROUND），但以 rawShares 直接計算，不乘 1000
  const effectiveLotType = isUSMarket(market) ? "ROUND" : lotType;
  const shares = isUSMarket(market)
    ? rawShares
    : effectiveLotType === "ROUND" && lots
      ? lotsToShares(lots)
      : rawShares;

  if (!shares || shares <= 0) {
    return NextResponse.json({ error: "股數不正確" }, { status: 400 });
  }

  const currency = marketToCurrency(market);
  const fees = calculateFees(market, {
    price,
    shares,
    side,
    isETF,
    commission,
  });
  const settlementDate = calcSettlementDate(market, new Date(tradeDate));

  try {
    const trade = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">) => {
      let realizedPnL: number | undefined;

      if (side === "SELL") {
        realizedPnL = await matchSellFIFO({
          tradeId: "",
          symbol: symbol.toUpperCase(),
          shares,
          netSellProceeds: fees.netAmount,
          userId: auth.userId,
        });
      }

      const created = await tx.trade.create({
        data: {
          symbol: symbol.toUpperCase(),
          symbolName,
          market,
          currency,
          side,
          tradeDate: new Date(tradeDate),
          settlementDate,
          lotType: effectiveLotType,
          lots: !isUSMarket(market) && effectiveLotType === "ROUND" ? lots : null,
          shares,
          price,
          commission: fees.commission,
          transactionTax: fees.transactionTax,
          totalFees: fees.totalFees,
          grossAmount: fees.grossAmount,
          netAmount: fees.netAmount,
          realizedPnL,
          isETF,
          stopLoss,
          notes,
          tags,
          userId: auth.userId,
        },
      });

      if (side === "BUY") {
        await tx.positionLot.create({
          data: {
            symbol: symbol.toUpperCase(),
            market,
            currency,
            lotType: effectiveLotType,
            openTradeId: created.id,
            openDate: new Date(tradeDate),
            shares,
            costPerShare: fees.netAmount / shares,
            isOpen: true,
            userId: auth.userId,
          },
        });
      }

      return created;
    });

    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    console.error("新增交易失敗:", error);
    return NextResponse.json({ error: "新增交易失敗" }, { status: 500 });
  }
}
