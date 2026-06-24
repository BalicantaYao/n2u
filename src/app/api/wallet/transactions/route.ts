import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { applyWalletMovement, getOrCreateWallet } from "@/lib/wallet";
import type { Currency } from "@/types/taiwan";

const CURRENCIES: Currency[] = ["TWD", "USD"];

// GET ?currency=TWD：回傳錢包異動帳本歷史（依時間新到舊）
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const currency = req.nextUrl.searchParams.get("currency");
  const where: Record<string, unknown> = { userId: auth.userId };
  if (currency) where.currency = currency;

  const txns = await prisma.walletTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(txns);
}

// POST：儲值（DEPOSIT）或提領（WITHDRAW）
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json();
  const currency = body.currency as Currency;
  const type = body.type as "DEPOSIT" | "WITHDRAW";
  const amount = Number(body.amount);
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: "幣別錯誤" }, { status: 400 });
  }
  if (type !== "DEPOSIT" && type !== "WITHDRAW") {
    return NextResponse.json({ error: "類型錯誤" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "金額需為大於 0 的數字" }, { status: 400 });
  }

  try {
    const balance = await prisma.$transaction(
      async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">) => {
        if (type === "WITHDRAW") {
          const wallet = await getOrCreateWallet(tx, auth.userId!, currency);
          if (wallet.balance < amount) {
            throw new Error("INSUFFICIENT");
          }
        }
        return applyWalletMovement(tx, {
          userId: auth.userId!,
          currency,
          type,
          amount: type === "DEPOSIT" ? amount : -amount,
          note,
        });
      },
    );
    return NextResponse.json({ currency, balance });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT") {
      return NextResponse.json({ error: "餘額不足，無法提領" }, { status: 400 });
    }
    console.error("錢包異動失敗:", error);
    return NextResponse.json({ error: "錢包異動失敗" }, { status: 500 });
  }
}
