import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const trade = await prisma.trade.findUnique({
    where: { id: params.id },
    include: { positionLots: true },
  });
  if (!trade) return NextResponse.json({ error: "找不到" }, { status: 404 });
  return NextResponse.json(trade);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  // 只允許更新備註、停損停利、tags
  const allowed = ["notes", "tags", "stopLoss", "takeProfit"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

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
  await prisma.trade.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
