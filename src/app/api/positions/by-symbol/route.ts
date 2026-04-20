import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const lots = await prisma.positionLot.findMany({
    where: { symbol, isOpen: true, userId: auth.userId },
    select: {
      shares: true,
      costPerShare: true,
      openTrade: { select: { price: true } },
    },
  });

  if (lots.length === 0) {
    return NextResponse.json(null);
  }

  type LotRow = {
    shares: number;
    costPerShare: number;
    openTrade: { price: number };
  };

  const totalShares = lots.reduce((sum: number, lot: LotRow) => sum + lot.shares, 0);
  const totalCost = lots.reduce(
    (sum: number, lot: LotRow) => sum + lot.shares * lot.costPerShare,
    0
  );
  const totalGross = lots.reduce(
    (sum: number, lot: LotRow) => sum + lot.shares * lot.openTrade.price,
    0
  );

  return NextResponse.json({
    totalShares,
    totalCost,
    avgCostPerShare: totalShares > 0 ? totalCost / totalShares : 0,
    avgPricePerShare: totalShares > 0 ? totalGross / totalShares : 0,
  });
}
