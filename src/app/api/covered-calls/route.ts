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
import type { Market } from "@/types/taiwan";
import type {
  CreateCoveredCallInput,
  UnderlyingType,
} from "@/types/covered-call";

const VALID_MARKETS = new Set<Market>(["TWSE", "TPEX", "NYSE", "NASDAQ"]);
const VALID_UNDERLYING = new Set<UnderlyingType>(["LONG_CALL", "STOCK"]);

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

  const symbol = (body.symbol ?? "").trim().toUpperCase();
  const market = (body.market ?? "").trim().toUpperCase() as Market;
  const underlyingType = (body.underlyingType ?? "LONG_CALL") as UnderlyingType;
  const openDate = parseDate(body.openDate);
  const expiry = parseDate(body.expiry);

  if (!symbol) {
    return NextResponse.json({ error: "股票代號不可為空" }, { status: 400 });
  }
  if (!VALID_MARKETS.has(market)) {
    return NextResponse.json({ error: "不支援的市場" }, { status: 400 });
  }
  if (!VALID_UNDERLYING.has(underlyingType)) {
    return NextResponse.json({ error: "不支援的底倉型態" }, { status: 400 });
  }
  if (!isPositiveNumber(body.quantity)) {
    return NextResponse.json({ error: "底倉數量必須大於 0" }, { status: 400 });
  }
  if (!isNonNegativeNumber(body.openPrice)) {
    return NextResponse.json({ error: "買進成本不可為負數" }, { status: 400 });
  }
  if (!openDate) {
    return NextResponse.json({ error: "請填寫買進日期" }, { status: 400 });
  }
  const contractMultiplier = body.contractMultiplier ?? 2000;
  if (!isPositiveNumber(contractMultiplier)) {
    return NextResponse.json({ error: "契約乘數必須大於 0" }, { status: 400 });
  }
  if (underlyingType === "LONG_CALL") {
    if (!isPositiveNumber(body.strike)) {
      return NextResponse.json({ error: "買權底倉需填寫履約價" }, { status: 400 });
    }
    if (!expiry) {
      return NextResponse.json({ error: "買權底倉需填寫到期日" }, { status: 400 });
    }
  }

  const position = await prisma.coveredCallPosition.create({
    data: {
      symbol,
      symbolName: body.symbolName?.trim() || null,
      market,
      currency: marketToCurrency(market),
      underlyingType,
      contractMultiplier,
      quantity: body.quantity,
      openDate,
      openPrice: body.openPrice,
      openFee: isNonNegativeNumber(body.openFee) ? body.openFee : 0,
      strike: isPositiveNumber(body.strike) ? body.strike : null,
      expiry,
      notes: body.notes?.trim() || null,
      userId: auth.userId,
    },
    include: legsInclude,
  });

  return NextResponse.json(position, { status: 201 });
}
