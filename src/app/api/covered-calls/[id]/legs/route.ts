import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
  legsInclude,
  isPositiveNumber,
  isNonNegativeNumber,
  parseDate,
} from "@/lib/covered-call-server";
import type { CreateLegInput } from "@/types/covered-call";

/** 新增一筆賣出 Call（sell call）；帶 rolledFromId 時同時把舊腳結算為轉倉 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const position = await prisma.coveredCallPosition.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!position || position.userId !== auth.userId) {
    return NextResponse.json({ error: "找不到此底倉" }, { status: 404 });
  }

  const body: CreateLegInput = await req.json();
  const openDate = parseDate(body.openDate);
  const expiry = parseDate(body.expiry);

  if (!isPositiveNumber(body.strike)) {
    return NextResponse.json({ error: "請填寫履約價" }, { status: 400 });
  }
  if (!expiry) {
    return NextResponse.json({ error: "請填寫到期日" }, { status: 400 });
  }
  if (!isPositiveNumber(body.contracts)) {
    return NextResponse.json({ error: "賣出口數必須大於 0" }, { status: 400 });
  }
  if (!openDate) {
    return NextResponse.json({ error: "請填寫賣出日期" }, { status: 400 });
  }
  if (!isNonNegativeNumber(body.openPremium)) {
    return NextResponse.json({ error: "權利金不可為負數" }, { status: 400 });
  }

  // 轉倉來源必須是同一個底倉底下、尚未平倉的腳
  let rolledFrom: { id: string; status: string } | null = null;
  if (body.rolledFromId) {
    const leg = await prisma.coveredCallLeg.findUnique({
      where: { id: body.rolledFromId },
      select: { id: true, userId: true, positionId: true, status: true },
    });
    if (!leg || leg.userId !== auth.userId || leg.positionId !== params.id) {
      return NextResponse.json({ error: "找不到要轉倉的賣出紀錄" }, { status: 404 });
    }
    if (leg.status !== "OPEN") {
      return NextResponse.json({ error: "此賣出紀錄已平倉" }, { status: 409 });
    }
    rolledFrom = { id: leg.id, status: leg.status };
  }

  const createData = {
    positionId: params.id,
    strike: body.strike,
    expiry,
    contracts: body.contracts,
    openDate,
    openPremium: body.openPremium,
    openFee: isNonNegativeNumber(body.openFee) ? body.openFee : 0,
    notes: body.notes?.trim() || null,
    rolledFromId: rolledFrom?.id ?? null,
    userId: auth.userId,
  };

  if (rolledFrom) {
    // 買回舊腳 + 賣出新腳必須同時成立，避免只留下半邊紀錄
    await prisma.$transaction([
      prisma.coveredCallLeg.update({
        where: { id: rolledFrom.id },
        data: {
          status: "ROLLED",
          closeDate: openDate,
          closePremium: isNonNegativeNumber(body.rollClosePremium)
            ? body.rollClosePremium
            : 0,
          closeFee: isNonNegativeNumber(body.rollCloseFee) ? body.rollCloseFee : 0,
        },
      }),
      prisma.coveredCallLeg.create({ data: createData }),
    ]);
  } else {
    await prisma.coveredCallLeg.create({ data: createData });
  }

  // 回傳整個底倉，前端可直接用新的權利金與掩護比例重繪
  const updated = await prisma.coveredCallPosition.findUnique({
    where: { id: params.id },
    include: legsInclude,
  });

  return NextResponse.json(updated, { status: 201 });
}
