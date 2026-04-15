import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { calculateFees, calcSettlementDate, lotsToShares } from "@/lib/taiwan-fees";
import { matchSellFIFO } from "@/lib/pnl-calculator";
import type { CreateTradeInput } from "@/types/trade";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body: { trades: CreateTradeInput[] } = await req.json();
  const { trades } = body;

  if (!Array.isArray(trades) || trades.length === 0) {
    return NextResponse.json({ error: "沒有交易資料" }, { status: 400 });
  }

  const results: Array<{ index: number; success: boolean; tradeId?: string; error?: string }> = [];
  let imported = 0;
  let failed = 0;

  // Process trades sequentially — order matters for FIFO P&L matching
  for (let i = 0; i < trades.length; i++) {
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
      isETF = false,
      stopLoss,
      takeProfit,
      notes,
      tags,
    } = trades[i];

    if (!symbol || !market || !side || !tradeDate || !price) {
      results.push({ index: i, success: false, error: "缺少必要欄位" });
      failed++;
      continue;
    }

    const shares = lotType === "ROUND" && lots ? lotsToShares(lots) : rawShares;

    if (!shares || shares <= 0) {
      results.push({ index: i, success: false, error: "股數不正確" });
      failed++;
      continue;
    }

    const fees = calculateFees({ price, shares, side, isETF });
    const settlementDate = calcSettlementDate(new Date(tradeDate));

    try {
      const trade = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">) => {
        let realizedPnL: number | undefined;

        if (side === "SELL") {
          realizedPnL = await matchSellFIFO({
            tradeId: "",
            userId: user.id,
            symbol: symbol.toUpperCase(),
            shares,
            netSellProceeds: fees.netAmount,
          });
        }

        const created = await tx.trade.create({
          data: {
            userId: user.id,
            symbol: symbol.toUpperCase(),
            symbolName,
            market,
            side,
            tradeDate: new Date(tradeDate),
            settlementDate,
            lotType,
            lots: lotType === "ROUND" ? lots : null,
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
            takeProfit,
            notes,
            tags,
          },
        });

        if (side === "BUY") {
          await tx.positionLot.create({
            data: {
              userId: user.id,
              symbol: symbol.toUpperCase(),
              market,
              lotType,
              openTradeId: created.id,
              openDate: new Date(tradeDate),
              shares,
              costPerShare: fees.netAmount / shares,
              isOpen: true,
            },
          });
        }

        return created;
      });

      results.push({ index: i, success: true, tradeId: trade.id });
      imported++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知錯誤";
      results.push({ index: i, success: false, error: message });
      failed++;
    }
  }

  return NextResponse.json({ results, imported, failed });
}
