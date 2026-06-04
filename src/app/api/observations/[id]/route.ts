import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { todayTaipei } from "@/lib/observation-date";
import type { UpdateObservationInput } from "@/types/observation";

async function getOwned(id: string, userId: string) {
  const target = await prisma.observationTarget.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!target || target.userId !== userId) return null;
  return target;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const owned = await getOwned(params.id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "找不到觀察標的" }, { status: 404 });
  }

  const body: UpdateObservationInput = await req.json();
  const data: {
    note?: string | null;
    archived?: boolean;
    sortOrder?: number;
    lastCheckedDate?: string | null;
  } = {};

  if (body.note !== undefined) data.note = body.note.trim() || null;
  if (body.archived !== undefined) data.archived = body.archived;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  if (body.checked !== undefined) {
    data.lastCheckedDate = body.checked ? todayTaipei() : null;
  }

  const updated = await prisma.observationTarget.update({
    where: { id: params.id },
    data,
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
    return NextResponse.json({ error: "找不到觀察標的" }, { status: 404 });
  }

  await prisma.observationTarget.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
