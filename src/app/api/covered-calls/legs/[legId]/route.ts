import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
  legsInclude,
  isPositiveNumber,
  isNonNegativeNumber,
  parseDate,
} from "@/lib/covered-call-server";
import { LEG_CLOSE_STATUSES } from "@/types/covered-call";
import type { LegStatus, UpdateLegInput } from "@/types/covered-call";

const CLOSE_STATUSES = new Set<LegStatus>(LEG_CLOSE_STATUSES);

async function getOwned(legId: string, userId: string) {
  const leg = await prisma.coveredCallLeg.findUnique({
    where: { id: legId },
    select: { id: true, userId: true, positionId: true },
  });
  if (!leg || leg.userId !== userId) return null;
  return leg;
}

/** 回傳所屬底倉（含所有賣出腳），讓前端一次更新整張卡片 */
async function positionResponse(positionId: string) {
  const position = await prisma.coveredCallPosition.findUnique({
    where: { id: positionId },
    include: legsInclude,
  });
  return NextResponse.json(position);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { legId: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const owned = await getOwned(params.legId, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "找不到此賣出紀錄" }, { status: 404 });
  }

  const body: UpdateLegInput = await req.json();
  const data: Record<string, unknown> = {};

  if (body.strike !== undefined) {
    if (!isPositiveNumber(body.strike)) {
      return NextResponse.json({ error: "履約價必須大於 0" }, { status: 400 });
    }
    data.strike = body.strike;
  }
  if (body.contracts !== undefined) {
    if (!isPositiveNumber(body.contracts)) {
      return NextResponse.json({ error: "賣出口數必須大於 0" }, { status: 400 });
    }
    data.contracts = body.contracts;
  }
  if (body.openPremium !== undefined) {
    if (!isNonNegativeNumber(body.openPremium)) {
      return NextResponse.json({ error: "權利金不可為負數" }, { status: 400 });
    }
    data.openPremium = body.openPremium;
  }
  if (body.openFee !== undefined) {
    if (!isNonNegativeNumber(body.openFee)) {
      return NextResponse.json({ error: "手續費不可為負數" }, { status: 400 });
    }
    data.openFee = body.openFee;
  }
  if (body.expiry !== undefined) {
    const expiry = parseDate(body.expiry);
    if (!expiry) {
      return NextResponse.json({ error: "到期日格式不正確" }, { status: 400 });
    }
    data.expiry = expiry;
  }
  if (body.openDate !== undefined) {
    const openDate = parseDate(body.openDate);
    if (!openDate) {
      return NextResponse.json({ error: "賣出日期格式不正確" }, { status: 400 });
    }
    data.openDate = openDate;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes.trim() || null;
  }

  if (body.status !== undefined) {
    if (body.status === "OPEN") {
      // 還原成未平倉，一併清掉平倉欄位
      data.status = "OPEN";
      data.closeDate = null;
      data.closePremium = null;
      data.closeFee = null;
    } else if (CLOSE_STATUSES.has(body.status)) {
      const closeDate = parseDate(body.closeDate);
      if (!closeDate) {
        return NextResponse.json({ error: "請填寫平倉日期" }, { status: 400 });
      }
      // 到期歸零代表權利金全數賺取，平倉價值視為 0
      const closePremium =
        body.status === "EXPIRED"
          ? 0
          : isNonNegativeNumber(body.closePremium)
            ? body.closePremium
            : null;
      if (closePremium == null) {
        return NextResponse.json({ error: "請填寫平倉權利金" }, { status: 400 });
      }
      data.status = body.status;
      data.closeDate = closeDate;
      data.closePremium = closePremium;
      data.closeFee = isNonNegativeNumber(body.closeFee) ? body.closeFee : 0;
    } else {
      return NextResponse.json({ error: "不支援的平倉方式" }, { status: 400 });
    }
  }

  await prisma.coveredCallLeg.update({ where: { id: params.legId }, data });
  return positionResponse(owned.positionId);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { legId: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const owned = await getOwned(params.legId, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "找不到此賣出紀錄" }, { status: 404 });
  }

  await prisma.coveredCallLeg.delete({ where: { id: params.legId } });
  return positionResponse(owned.positionId);
}
