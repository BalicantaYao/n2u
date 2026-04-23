import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
  computeNetPremium,
  signedPremium,
  type OptionAction,
  type OptionStatus,
} from "@/types/option";

const VALID_ACTIONS: OptionAction[] = ["SELL_PUT", "BUY_PUT"];
const VALID_STATUS: OptionStatus[] = ["OPEN", "CLOSED"];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const option = await prisma.optionTrade.findUnique({ where: { id: params.id } });
  if (!option || option.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到" }, { status: 404 });
  }
  return NextResponse.json(option);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json();
  const existing = await prisma.optionTrade.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到此交易" }, { status: 404 });
  }

  const action = (body.action ?? existing.action) as OptionAction;
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "無效的動作" }, { status: 400 });
  }
  const status = (body.status ?? existing.status) as OptionStatus;
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "無效的狀態" }, { status: 400 });
  }

  const quantity = body.quantity ?? existing.quantity;
  if (quantity <= 0) {
    return NextResponse.json({ error: "數量必須大於 0" }, { status: 400 });
  }
  const strikePrice = body.strikePrice ?? existing.strikePrice;
  const expirationDate = body.expirationDate
    ? new Date(body.expirationDate)
    : existing.expirationDate;
  const tradeDate = body.tradeDate ? new Date(body.tradeDate) : existing.tradeDate;
  const delta = "delta" in body ? body.delta : existing.delta;
  const notes = "notes" in body ? body.notes : existing.notes;
  const symbol = (body.symbol ?? existing.symbol).toUpperCase();

  // Premium: accept absolute value from client and re-sign based on action
  const absPremium =
    body.premium != null ? Math.abs(body.premium) : Math.abs(existing.premium);

  try {
    const updated = await prisma.optionTrade.update({
      where: { id: params.id },
      data: {
        symbol,
        action,
        quantity,
        strikePrice,
        expirationDate,
        tradeDate,
        delta: delta ?? null,
        premium: signedPremium(action, absPremium),
        netPremium: computeNetPremium(action, absPremium, quantity),
        status,
        notes: notes ?? null,
      },
    });

    revalidatePath("/options");
    revalidatePath(`/options/${params.id}/edit`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("更新選擇權交易失敗:", error);
    return NextResponse.json({ error: "更新選擇權交易失敗" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const option = await prisma.optionTrade.findUnique({ where: { id: params.id } });
  if (!option || option.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到" }, { status: 404 });
  }

  await prisma.optionTrade.delete({ where: { id: params.id } });
  revalidatePath("/options");
  return NextResponse.json({ ok: true });
}
