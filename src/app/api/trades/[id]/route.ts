import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { calculateFees, calcSettlementDate, lotsToShares } from "@/lib/taiwan-fees";

const CORE_FIELDS = [
  "symbol", "symbolName", "market", "side", "tradeDate",
  "lotType", "lots", "shares", "price", "isETF",
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
  const market = body.market ?? existing.market;
  const side = body.side ?? existing.side;
  const tradeDate = body.tradeDate ?? existing.tradeDate;
  const lotType = body.lotType ?? existing.lotType;
  const isETF = body.isETF ?? existing.isETF;
  const price = body.price ?? existing.price;

  const newLots = body.lots ?? existing.lots;
  const rawShares = body.shares ?? existing.shares;
  const shares = lotType === "ROUND" && newLots ? lotsToShares(newLots) : rawShares;

  if (!shares || shares <= 0) {
    return NextResponse.json({ error: "股數不正確" }, { status: 400 });
  }

  const fees = calculateFees({ price, shares, side, isETF });
  const tradeDateObj = new Date(tradeDate);
  const settlementDate = calcSettlementDate(tradeDateObj);

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
          side,
          tradeDate: tradeDateObj,
          settlementDate,
          lotType,
          lots: lotType === "ROUND" ? newLots : null,
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

      // Update the associated PositionLot
      if (lots.length > 0) {
        await tx.positionLot.update({
          where: { id: lots[0].id },
          data: {
            symbol,
            market,
            lotType,
            openDate: tradeDateObj,
            shares,
            costPerShare: fees.netAmount / shares,
          },
        });
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
      }

      return updated;
    });

    revalidatePath("/positions");
    revalidatePath("/journal");
    revalidatePath(`/journal/${params.id}/edit`);

    return NextResponse.json(trade);
  } catch (error) {
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

  await prisma.trade.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
