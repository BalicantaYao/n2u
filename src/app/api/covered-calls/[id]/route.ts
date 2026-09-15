import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
  legsInclude,
  isPositiveNumber,
  isNonNegativeNumber,
  parseDate,
} from "@/lib/covered-call-server";
import type { UpdateCoveredCallInput } from "@/types/covered-call";

async function getOwned(id: string, userId: string) {
  const position = await prisma.coveredCallPosition.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!position || position.userId !== userId) return null;
  return position;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const position = await prisma.coveredCallPosition.findUnique({
    where: { id: params.id },
    include: legsInclude,
  });
  if (!position || position.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到此底倉" }, { status: 404 });
  }
  return NextResponse.json(position);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const owned = await getOwned(params.id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "找不到此底倉" }, { status: 404 });
  }

  const body: UpdateCoveredCallInput = await req.json();
  const data: Record<string, unknown> = {};

  if (body.quantity !== undefined) {
    if (!isPositiveNumber(body.quantity)) {
      return NextResponse.json({ error: "底倉數量必須大於 0" }, { status: 400 });
    }
    data.quantity = body.quantity;
  }
  if (body.openPrice !== undefined) {
    if (!isNonNegativeNumber(body.openPrice)) {
      return NextResponse.json({ error: "買進成本不可為負數" }, { status: 400 });
    }
    data.openPrice = body.openPrice;
  }
  if (body.openFee !== undefined) {
    if (!isNonNegativeNumber(body.openFee)) {
      return NextResponse.json({ error: "手續費不可為負數" }, { status: 400 });
    }
    data.openFee = body.openFee;
  }
  if (body.contractMultiplier !== undefined) {
    if (!isPositiveNumber(body.contractMultiplier)) {
      return NextResponse.json({ error: "契約乘數必須大於 0" }, { status: 400 });
    }
    data.contractMultiplier = body.contractMultiplier;
  }
  if (body.strike !== undefined) {
    data.strike = isPositiveNumber(body.strike) ? body.strike : null;
  }
  if (body.expiry !== undefined) {
    data.expiry = parseDate(body.expiry);
  }
  if (body.notes !== undefined) {
    data.notes = body.notes.trim() || null;
  }

  // closeDate 為關閉底倉的開關：有值 = 平倉，null = 重新開啟
  if (body.closeDate !== undefined) {
    if (body.closeDate === null) {
      data.status = "OPEN";
      data.closeDate = null;
      data.closePrice = null;
      data.closeFee = null;
    } else {
      const closeDate = parseDate(body.closeDate);
      if (!closeDate) {
        return NextResponse.json({ error: "平倉日期格式不正確" }, { status: 400 });
      }
      if (!isNonNegativeNumber(body.closePrice)) {
        return NextResponse.json({ error: "請填寫平倉價格" }, { status: 400 });
      }
      data.status = "CLOSED";
      data.closeDate = closeDate;
      data.closePrice = body.closePrice;
      data.closeFee = isNonNegativeNumber(body.closeFee) ? body.closeFee : 0;
    }
  }

  const updated = await prisma.coveredCallPosition.update({
    where: { id: params.id },
    data,
    include: legsInclude,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const owned = await getOwned(params.id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "找不到此底倉" }, { status: 404 });
  }

  // 賣出腳由資料庫 cascade 一併刪除
  await prisma.coveredCallPosition.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
