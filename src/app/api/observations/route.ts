import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { marketToCurrency } from "@/types/taiwan";
import { isCheckedToday } from "@/lib/observation-date";
import type { Market } from "@/types/taiwan";
import type { CreateObservationInput } from "@/types/observation";

const VALID_MARKETS = new Set<Market>(["TWSE", "TPEX", "NYSE", "NASDAQ"]);

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const pending = searchParams.get("pending") === "1";
  const archived = searchParams.get("archived") === "1";

  const targets = await prisma.observationTarget.findMany({
    where: { userId: auth.userId, archived },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  // 今日待確認：未封存且今天尚未確認過
  const result = pending
    ? targets.filter((t) => !isCheckedToday(t.lastCheckedDate))
    : targets;

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body: CreateObservationInput = await req.json();
  const symbol = (body.symbol ?? "").trim().toUpperCase();
  const market = (body.market ?? "").trim().toUpperCase() as Market;

  if (!symbol) {
    return NextResponse.json({ error: "股票代號不可為空" }, { status: 400 });
  }
  if (!VALID_MARKETS.has(market)) {
    return NextResponse.json({ error: "不支援的市場" }, { status: 400 });
  }

  const existing = await prisma.observationTarget.findUnique({
    where: { userId_symbol_market: { userId: auth.userId, symbol, market } },
  });
  if (existing) {
    // 若先前已封存，重新加入時自動解除封存
    if (existing.archived) {
      const reactivated = await prisma.observationTarget.update({
        where: { id: existing.id },
        data: {
          archived: false,
          note: body.note?.trim() || existing.note,
        },
      });
      return NextResponse.json(reactivated, { status: 200 });
    }
    return NextResponse.json({ error: "此標的已在每日觀察中" }, { status: 409 });
  }

  const maxSort = await prisma.observationTarget.aggregate({
    where: { userId: auth.userId },
    _max: { sortOrder: true },
  });

  const target = await prisma.observationTarget.create({
    data: {
      symbol,
      symbolName: body.symbolName?.trim() || null,
      market,
      currency: marketToCurrency(market),
      note: body.note?.trim() || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      userId: auth.userId,
    },
  });

  return NextResponse.json(target, { status: 201 });
}
