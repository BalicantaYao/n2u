import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import type { CreateWatchlistInput } from "@/types/watchlist";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const watchlists = await prisma.watchlist.findMany({
    where: { userId: auth.userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(watchlists);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body: CreateWatchlistInput = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "名單名稱不可為空" }, { status: 400 });
  }

  const maxSort = await prisma.watchlist.aggregate({
    where: { userId: auth.userId },
    _max: { sortOrder: true },
  });

  const watchlist = await prisma.watchlist.create({
    data: {
      name,
      description: body.description?.trim() || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      userId: auth.userId,
    },
  });

  return NextResponse.json(watchlist, { status: 201 });
}
