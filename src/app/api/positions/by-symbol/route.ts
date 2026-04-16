import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const lots = await prisma.positionLot.findMany({
    where: { symbol, isOpen: true },
    select: { shares: true, costPerShare: true },
  });

  if (lots.length === 0) {
    return NextResponse.json(null);
  }

  const totalShares = lots.reduce((sum: number, lot: { shares: number }) => sum + lot.shares, 0);
  const totalCost = lots.reduce(
    (sum: number, lot: { shares: number; costPerShare: number }) => sum + lot.shares * lot.costPerShare,
    0
  );

  return NextResponse.json({
    totalShares,
    totalCost,
    avgCostPerShare: totalShares > 0 ? totalCost / totalShares : 0,
  });
}
