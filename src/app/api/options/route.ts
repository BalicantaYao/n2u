import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
  computeNetPremium,
  signedPremium,
  type CreateOptionTradeInput,
  type OptionAction,
  type OptionStatus,
} from "@/types/option";

const VALID_ACTIONS: OptionAction[] = ["SELL_PUT", "BUY_PUT"];
const VALID_STATUS: OptionStatus[] = ["OPEN", "CLOSED"];

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const where: Record<string, unknown> = { userId: auth.userId };

  const symbol = searchParams.get("symbol");
  const action = searchParams.get("action");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (symbol) where.symbol = symbol.toUpperCase();
  if (action) where.action = action;
  if (status) where.status = status;
  if (from || to) {
    where.tradeDate = {};
    if (from) (where.tradeDate as Record<string, unknown>).gte = new Date(from);
    if (to) (where.tradeDate as Record<string, unknown>).lte = new Date(to);
  }

  const options = await prisma.optionTrade.findMany({
    where,
    orderBy: { tradeDate: "desc" },
  });

  return NextResponse.json(options);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body: CreateOptionTradeInput = await req.json();

  const {
    symbol,
    action,
    quantity,
    strikePrice,
    expirationDate,
    tradeDate,
    delta,
    premium,
    status = "OPEN",
    notes,
  } = body;

  if (!symbol || !action || !strikePrice || !expirationDate || !tradeDate || premium == null) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "無效的動作" }, { status: 400 });
  }
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "無效的狀態" }, { status: 400 });
  }
  const qty = quantity ?? 1;
  if (qty <= 0) {
    return NextResponse.json({ error: "數量必須大於 0" }, { status: 400 });
  }

  try {
    const option = await prisma.optionTrade.create({
      data: {
        symbol: symbol.toUpperCase(),
        market: "NASDAQ",
        currency: "USD",
        action,
        quantity: qty,
        strikePrice,
        expirationDate: new Date(expirationDate),
        tradeDate: new Date(tradeDate),
        delta: delta ?? null,
        premium: signedPremium(action, premium),
        netPremium: computeNetPremium(action, premium, qty),
        status,
        notes: notes ?? null,
        userId: auth.userId,
      },
    });

    return NextResponse.json(option, { status: 201 });
  } catch (error) {
    console.error("新增選擇權交易失敗:", error);
    return NextResponse.json({ error: "新增選擇權交易失敗" }, { status: 500 });
  }
}
