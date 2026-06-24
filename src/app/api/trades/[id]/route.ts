import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { calculateFees, calcSettlementDate } from "@/lib/fees";
import { lotsToShares } from "@/lib/taiwan-fees";
import { recomputeSymbolPnL } from "@/lib/pnl-calculator";
import { marketToCurrency, isUSMarket } from "@/types/taiwan";
import { applyWalletMovement, assertSufficientBalance, InsufficientFundsError } from "@/lib/wallet";

const CORE_FIELDS = [
  "symbol", "symbolName", "market", "side", "tradeDate",
  "lotType", "lots", "shares", "price", "commission", "isETF",
];

const METADATA_FIELDS = ["notes", "tags", "stopLoss"];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const trade = await prisma.trade.findUnique({
    where: { id: params.id },
    include: { positionLots: true },
  });
  if (!trade || trade.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到" }, { status: 404 });
  }
  return NextResponse.json(trade);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json();

  const existing = await prisma.trade.findUnique({
    where: { id: params.id },
    include: { positionLots: true },
  });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到此交易" }, { status: 404 });
  }

  const hasCoreChange = CORE_FIELDS.some(
    (f) => f in body && body[f] !== (existing as Record<string, unknown>)[f]
  );

  // Metadata-only update (notes, tags, stopLoss)
  if (!hasCoreChange) {
    const data: Record<string, unknown> = {};
    for (const key of METADATA_FIELDS) {
      if (key in body) data[key] = body[key];
    }

    // 整體部位停損：若 stopLoss 有變化，同步到該部位其他仍有開倉 lot 的 BUY trades
    const stopLossChanged =
      "stopLoss" in body && body.stopLoss !== existing.stopLoss;

    const trade = await prisma.$transaction(
      async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">) => {
        const updated = await tx.trade.update({
          where: { id: params.id },
          data,
        });

        if (existing.side === "BUY" && stopLossChanged) {
          await tx.trade.updateMany({
            where: {
              userId: auth.userId,
              symbol: existing.symbol,
              side: "BUY",
              id: { not: existing.id },
              positionLots: { some: { isOpen: true } },
            },
            data: { stopLoss: body.stopLoss ?? null },
          });

          // 記錄此次停損調整與筆記
          await tx.stopLossAdjustment.create({
            data: {
              userId: auth.userId,
              symbol: existing.symbol,
              market: existing.market,
              previousStopLoss: existing.stopLoss,
              newStopLoss: body.stopLoss ?? null,
              note:
                typeof body.stopLossNote === "string" && body.stopLossNote.trim() !== ""
                  ? body.stopLossNote.trim()
                  : null,
            },
          });
        }

        return updated;
      }
    );

    revalidatePath("/positions");
    revalidatePath("/journal");
    revalidatePath(`/journal/${params.id}/edit`);

    return NextResponse.json(trade);
  }

  // Core field change — enforce restrictions
  if (existing.side === "SELL") {
    return NextResponse.json(
      { error: "賣出交易不可修改核心欄位，請刪除後重新建立" },
      { status: 400 }
    );
  }

  if (body.side && body.side === "SELL") {
    return NextResponse.json(
      { error: "不可將買進改為賣出，請刪除後重新建立" },
      { status: 400 }
    );
  }

  // Check if position lot has been consumed by a SELL trade
  const lots = existing.positionLots;
  const isConsumed = lots.some(
    (l) => !l.isOpen || l.shares < existing.shares
  );
  if (isConsumed) {
    return NextResponse.json(
      { error: "此買進交易已被配對，無法修改核心欄位" },
      { status: 400 }
    );
  }

  // Full update with fee recalculation
  const symbol = (body.symbol ?? existing.symbol).toUpperCase();
  const symbolName = body.symbolName ?? existing.symbolName;
  const market = (body.market ?? existing.market) as import("@/types/taiwan").Market;
  const side = body.side ?? existing.side;
  const tradeDate = body.tradeDate ?? existing.tradeDate;
  const isETF = body.isETF ?? existing.isETF;
  const price = body.price ?? existing.price;
  const commission = body.commission;

  // 美股一律 ROUND，且以 shares 本身計算（不乘 1000）
  const lotType = isUSMarket(market)
    ? "ROUND"
    : (body.lotType ?? existing.lotType);
  const currency = marketToCurrency(market);

  const newLots = body.lots ?? existing.lots;
  const rawShares = body.shares ?? existing.shares;
  const shares = isUSMarket(market)
    ? rawShares
    : lotType === "ROUND" && newLots
      ? lotsToShares(newLots)
      : rawShares;

  if (!shares || shares <= 0) {
    return NextResponse.json({ error: "股數不正確" }, { status: 400 });
  }

  const userPref = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { commissionDiscount: true },
  });
  const fees = calculateFees(market, {
    price,
    shares,
    side,
    isETF,
    commission,
    commissionDiscount: userPref?.commissionDiscount ?? 1,
  });
  const tradeDateObj = new Date(tradeDate);
  const settlementDate = calcSettlementDate(market, tradeDateObj);

  try {
    const trade = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">) => {
      // Update metadata fields alongside core fields
      const stopLoss = "stopLoss" in body ? body.stopLoss : existing.stopLoss;
      const notes = "notes" in body ? body.notes : existing.notes;
      const tags = "tags" in body ? body.tags : existing.tags;

      const updated = await tx.trade.update({
        where: { id: params.id },
        data: {
          symbol,
          symbolName,
          market,
          currency,
          side,
          tradeDate: tradeDateObj,
          settlementDate,
          lotType,
          lots: !isUSMarket(market) && lotType === "ROUND" ? newLots : null,
          shares,
          price,
          commission: fees.commission,
          transactionTax: fees.transactionTax,
          totalFees: fees.totalFees,
          grossAmount: fees.grossAmount,
          netAmount: fees.netAmount,
          isETF,
          stopLoss,
          notes,
          tags,
        },
      });

      // 錢包：先回沖此交易原本的累計影響（以原幣別），再依新金額重新扣款。
      // 僅 BUY 會走到此處（SELL 核心欄位已於前面擋下）。歷史交易無連結帳本 → 回沖總和為 0。
      const linkedOld = await tx.walletTransaction.aggregate({
        where: { tradeId: params.id },
        _sum: { amount: true },
      });
      const oldNetEffect = linkedOld._sum.amount ?? 0;
      const hadWalletMovement = oldNetEffect !== 0;
      if (hadWalletMovement) {
        await applyWalletMovement(tx, {
          userId: auth.userId,
          currency: existing.currency as import("@/types/taiwan").Currency,
          type: "REVERSAL",
          amount: -oldNetEffect,
          tradeId: params.id,
          note: "交易修改回沖",
        });

        // 以新金額重新扣款（先確認新幣別錢包餘額充足）
        await assertSufficientBalance(tx, auth.userId, currency, fees.netAmount);
        await applyWalletMovement(tx, {
          userId: auth.userId,
          currency,
          type: "TRADE_BUY",
          amount: -fees.netAmount,
          tradeId: params.id,
        });
      }

      // 重算受影響 symbol 的 FIFO 與 realizedPnL；若 symbol 變動，新舊都要重算
      await recomputeSymbolPnL(tx, auth.userId, symbol);
      if (symbol !== existing.symbol) {
        await recomputeSymbolPnL(tx, auth.userId, existing.symbol);
      }

      // 整體部位停損：若 symbol 未變動且 stopLoss 變了，同步給其他仍有開倉的 BUY trades
      const symbolUnchanged = symbol === existing.symbol;
      if (side === "BUY" && symbolUnchanged && stopLoss !== existing.stopLoss) {
        await tx.trade.updateMany({
          where: {
            userId: auth.userId,
            symbol,
            side: "BUY",
            id: { not: existing.id },
            positionLots: { some: { isOpen: true } },
          },
          data: { stopLoss: stopLoss ?? null },
        });

        // 記錄此次停損調整與筆記
        await tx.stopLossAdjustment.create({
          data: {
            userId: auth.userId,
            symbol,
            market,
            previousStopLoss: existing.stopLoss,
            newStopLoss: stopLoss ?? null,
            note:
              typeof body.stopLossNote === "string" && body.stopLossNote.trim() !== ""
                ? body.stopLossNote.trim()
                : null,
          },
        });
      }

      return updated;
    });

    revalidatePath("/positions");
    revalidatePath("/journal");
    revalidatePath(`/journal/${params.id}/edit`);

    return NextResponse.json(trade);
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      return NextResponse.json(
        {
          error: "餘額不足，請先儲值",
          code: "INSUFFICIENT_FUNDS",
          currency: error.currency,
          required: error.required,
          balance: error.balance,
        },
        { status: 400 },
      );
    }
    console.error("更新交易失敗:", error);
    return NextResponse.json({ error: "更新交易失敗" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const trade = await prisma.trade.findUnique({ where: { id: params.id } });
  if (!trade || trade.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到" }, { status: 404 });
  }

  const symbol = trade.symbol;

  await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">) => {
    // 回沖此交易對錢包的累計影響（歷史交易無連結帳本 → 總和為 0，自然 no-op）
    const linked = await tx.walletTransaction.aggregate({
      where: { tradeId: params.id },
      _sum: { amount: true },
    });
    const netEffect = linked._sum.amount ?? 0;
    if (netEffect !== 0) {
      await applyWalletMovement(tx, {
        userId: auth.userId,
        currency: trade.currency as import("@/types/taiwan").Currency,
        type: "REVERSAL",
        amount: -netEffect,
        tradeId: params.id,
        note: "交易刪除回沖",
      });
    }

    await tx.trade.delete({ where: { id: params.id } });
    await recomputeSymbolPnL(tx, auth.userId, symbol);
  });

  revalidatePath("/positions");
  revalidatePath("/journal");

  return NextResponse.json({ ok: true });
}
