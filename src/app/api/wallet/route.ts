import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import type { Currency } from "@/types/taiwan";

const CURRENCIES: Currency[] = ["TWD", "USD"];

// GET：回傳使用者的 TWD / USD 兩個錢包餘額（缺則建立為 0）
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const existing = await prisma.wallet.findMany({
    where: { userId: auth.userId },
  });
  const byCurrency = new Map(existing.map((w) => [w.currency, w]));

  // 建立尚未存在的幣別錢包，確保前端兩種幣別都有資料
  const missing = CURRENCIES.filter((c) => !byCurrency.has(c));
  if (missing.length > 0) {
    await prisma.wallet.createMany({
      data: missing.map((currency) => ({ userId: auth.userId!, currency })),
      skipDuplicates: true,
    });
  }

  const wallets = await prisma.wallet.findMany({
    where: { userId: auth.userId },
    orderBy: { currency: "asc" },
  });

  return NextResponse.json(
    wallets.map((w) => ({ currency: w.currency, balance: w.balance })),
  );
}
