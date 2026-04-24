import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import type { CreateWatchlistItemInput } from "@/types/watchlist";

const VALID_MARKETS = new Set(["TWSE", "TPEX", "NYSE", "NASDAQ"]);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const watchlist = await prisma.watchlist.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!watchlist || watchlist.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到觀察名單" }, { status: 404 });
  }

  const body: CreateWatchlistItemInput = await req.json();
  const symbol = (body.symbol ?? "").trim().toUpperCase();
  const market = (body.market ?? "").trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "股票代號不可為空" }, { status: 400 });
  }
  if (!VALID_MARKETS.has(market)) {
    return NextResponse.json({ error: "不支援的市場" }, { status: 400 });
  }

  const existing = await prisma.watchlistItem.findUnique({
    where: { watchlistId_symbol: { watchlistId: params.id, symbol } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "此股票已在名單中" },
      { status: 409 },
    );
  }

  const maxSort = await prisma.watchlistItem.aggregate({
    where: { watchlistId: params.id },
    _max: { sortOrder: true },
  });

  const item = await prisma.watchlistItem.create({
    data: {
      symbol,
      symbolName: body.symbolName?.trim() || null,
      market,
      note: body.note?.trim() || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      watchlistId: params.id,
      userId: auth.userId,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
