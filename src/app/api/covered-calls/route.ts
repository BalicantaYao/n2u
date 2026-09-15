import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
  legsInclude,
  isPositiveNumber,
  isNonNegativeNumber,
  parseDate,
} from "@/lib/covered-call-server";
import { marketToCurrency } from "@/types/taiwan";
import { TAIEX_UNDERLYING } from "@/types/covered-call";
import type { CreateCoveredCallInput } from "@/types/covered-call";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const positions = await prisma.coveredCallPosition.findMany({
    where: {
      userId: auth.userId,
      ...(status === "OPEN" || status === "CLOSED" ? { status } : {}),
    },
    include: legsInclude,
    orderBy: [{ status: "asc" }, { openDate: "desc" }],
  });

  return NextResponse.json(positions);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body: CreateCoveredCallInput = await req.json();

  const openDate = parseDate(body.openDate);
  const expiry = parseDate(body.expiry);

  if (!isPositiveNumber(body.quantity)) {
    return NextResponse.json({ error: "底倉數量必須大於 0" }, { status: 400 });
  }
  if (!isNonNegativeNumber(body.openPrice)) {
    return NextResponse.json({ error: "買進成本不可為負數" }, { status: 400 });
  }
  if (!openDate) {
    return NextResponse.json({ error: "請填寫買進日期" }, { status: 400 });
  }
  if (!isPositiveNumber(body.strike)) {
    return NextResponse.json({ error: "買權底倉需填寫履約價" }, { status: 400 });
  }
  if (!expiry) {
    return NextResponse.json({ error: "買權底倉需填寫到期日" }, { status: 400 });
  }

  // 標的固定為台股加權股價指數（台指選擇權），不接受前端指定
  const position = await prisma.coveredCallPosition.create({
    data: {
      symbol: TAIEX_UNDERLYING.symbol,
      symbolName: TAIEX_UNDERLYING.symbolName,
      market: TAIEX_UNDERLYING.market,
      currency: marketToCurrency(TAIEX_UNDERLYING.market),
      underlyingType: TAIEX_UNDERLYING.underlyingType,
      contractMultiplier: TAIEX_UNDERLYING.contractMultiplier,
      quantity: body.quantity,
      openDate,
      openPrice: body.openPrice,
      openFee: isNonNegativeNumber(body.openFee) ? body.openFee : 0,
      strike: body.strike,
      expiry,
      notes: body.notes?.trim() || null,
      userId: auth.userId,
    },
    include: legsInclude,
  });

  return NextResponse.json(position, { status: 201 });
}
