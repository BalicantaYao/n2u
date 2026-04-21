import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { parseTags, tagsToString } from "@/lib/memo-tags";
import type { CreateMemoInput } from "@/types/memo";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const where: Record<string, unknown> = { userId: auth.userId };

  const tag = searchParams.get("tag");
  const symbol = searchParams.get("symbol");
  const search = searchParams.get("search");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (tag) where.tags = { contains: tag.toLowerCase() };
  if (symbol) where.linkedSymbol = symbol.toUpperCase();
  if (search) where.content = { contains: search, mode: "insensitive" };
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
  }

  const memos = await prisma.memo.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(memos);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body: CreateMemoInput = await req.json();
  const content = (body.content ?? "").trim();

  if (!content) {
    return NextResponse.json({ error: "內容不可為空" }, { status: 400 });
  }

  const tags = tagsToString(parseTags(content));
  const linkedSymbol = body.linkedSymbol
    ? body.linkedSymbol.toUpperCase()
    : null;

  let tradeId: string | null = null;
  if (body.tradeId) {
    const trade = await prisma.trade.findUnique({
      where: { id: body.tradeId },
      select: { userId: true },
    });
    if (trade && trade.userId === auth.userId) {
      tradeId = body.tradeId;
    }
  }

  const memo = await prisma.memo.create({
    data: {
      content,
      tags,
      linkedSymbol,
      tradeId,
      pinned: body.pinned ?? false,
      userId: auth.userId,
    },
  });

  return NextResponse.json(memo, { status: 201 });
}
