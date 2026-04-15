import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const trade = await prisma.trade.findFirst({
    where: { id: params.id, userId: user.id },
    include: { positionLots: true },
  });
  if (!trade) return NextResponse.json({ error: "找不到" }, { status: 404 });
  return NextResponse.json(trade);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const body = await req.json();
  // 只允許更新備註、停損停利、tags
  const allowed = ["notes", "tags", "stopLoss", "takeProfit"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  // Ensure user owns this trade
  const existing = await prisma.trade.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "找不到" }, { status: 404 });

  const trade = await prisma.trade.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(trade);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  // Ensure user owns this trade
  const existing = await prisma.trade.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "找不到" }, { status: 404 });

  await prisma.trade.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
