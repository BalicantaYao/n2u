import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, name: true, email: true, image: true, commissionDiscount: true },
  });
  if (!user) {
    return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("commissionDiscount" in body) {
    const raw = Number(body.commissionDiscount);
    if (!Number.isFinite(raw) || raw <= 0 || raw > 1) {
      return NextResponse.json(
        { error: "手續費折扣需介於 0 與 1 之間（含 1）" },
        { status: 400 },
      );
    }
    // 統一儲存到小數點後 4 位
    data.commissionDiscount = Math.round(raw * 10000) / 10000;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data,
    select: { id: true, name: true, email: true, image: true, commissionDiscount: true },
  });
  return NextResponse.json(user);
}
