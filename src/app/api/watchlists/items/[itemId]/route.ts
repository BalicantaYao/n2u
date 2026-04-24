import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: { itemId: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const existing = await prisma.watchlistItem.findUnique({
    where: { id: params.itemId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到項目" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("note" in body) {
    data.note =
      typeof body.note === "string" ? body.note.trim() || null : null;
  }
  if (typeof body.sortOrder === "number") {
    data.sortOrder = body.sortOrder;
  }

  const item = await prisma.watchlistItem.update({
    where: { id: params.itemId },
    data,
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { itemId: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const existing = await prisma.watchlistItem.findUnique({
    where: { id: params.itemId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到項目" }, { status: 404 });
  }

  await prisma.watchlistItem.delete({ where: { id: params.itemId } });
  return NextResponse.json({ ok: true });
}
