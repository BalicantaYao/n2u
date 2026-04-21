import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { parseTags, tagsToString } from "@/lib/memo-tags";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const memo = await prisma.memo.findUnique({ where: { id: params.id } });
  if (!memo || memo.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到" }, { status: 404 });
  }
  return NextResponse.json(memo);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const existing = await prisma.memo.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到此備忘錄" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.content === "string") {
    const content = body.content.trim();
    if (!content) {
      return NextResponse.json({ error: "內容不可為空" }, { status: 400 });
    }
    data.content = content;
    data.tags = tagsToString(parseTags(content));
  }

  if ("linkedSymbol" in body) {
    data.linkedSymbol = body.linkedSymbol
      ? String(body.linkedSymbol).toUpperCase()
      : null;
  }

  if ("tradeId" in body) {
    if (body.tradeId) {
      const trade = await prisma.trade.findUnique({
        where: { id: body.tradeId },
        select: { userId: true },
      });
      data.tradeId = trade && trade.userId === auth.userId ? body.tradeId : null;
    } else {
      data.tradeId = null;
    }
  }

  if (typeof body.pinned === "boolean") {
    data.pinned = body.pinned;
  }

  const memo = await prisma.memo.update({
    where: { id: params.id },
    data,
  });

  revalidatePath("/memos");
  return NextResponse.json(memo);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const memo = await prisma.memo.findUnique({ where: { id: params.id } });
  if (!memo || memo.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到" }, { status: 404 });
  }

  await prisma.memo.delete({ where: { id: params.id } });
  revalidatePath("/memos");
  return NextResponse.json({ ok: true });
}
