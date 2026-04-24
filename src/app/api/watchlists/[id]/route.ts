import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const watchlist = await prisma.watchlist.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!watchlist || watchlist.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到觀察名單" }, { status: 404 });
  }

  return NextResponse.json(watchlist);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const existing = await prisma.watchlist.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到觀察名單" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "名單名稱不可為空" }, { status: 400 });
    }
    data.name = name;
  }
  if ("description" in body) {
    data.description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;
  }
  if (typeof body.sortOrder === "number") {
    data.sortOrder = body.sortOrder;
  }

  const watchlist = await prisma.watchlist.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(watchlist);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const existing = await prisma.watchlist.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到觀察名單" }, { status: 404 });
  }

  await prisma.watchlist.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
