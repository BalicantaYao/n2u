import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.watchlist.findMany({
    orderBy: { addedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { symbol, symbolName, market, isETF } = body;

  if (!symbol || !market) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const item = await prisma.watchlist.upsert({
    where: { symbol: symbol.toUpperCase() },
    update: { symbolName, market, isETF: isETF ?? false },
    create: {
      symbol: symbol.toUpperCase(),
      symbolName,
      market,
      isETF: isETF ?? false,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
