import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { recomputeSymbolPnL } from "@/lib/pnl-calculator";
import {
  BACKUP_USER_FIELDS,
  backupFilename,
  buildTradeBackup,
  planRestore,
  serializeTradeBackup,
  stockScope,
  tradeLinkedWalletScope,
  tradesToImportCsv,
} from "@/lib/trade-backup";

export const dynamic = "force-dynamic";

const TRADE_ORDER = [
  { tradeDate: "asc" as const },
  { createdAt: "asc" as const },
  { id: "asc" as const },
];

async function loadBackup(userId: string) {
  const [user, trades, stopLossAdjustments, walletTransactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: BACKUP_USER_FIELDS,
    }),
    prisma.trade.findMany({
      where: stockScope(userId),
      orderBy: TRADE_ORDER,
    }),
    prisma.stopLossAdjustment.findMany({
      where: stockScope(userId),
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.walletTransaction.findMany({
      where: tradeLinkedWalletScope(userId),
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  return buildTradeBackup({
    commissionDiscount: user?.commissionDiscount ?? null,
    trades,
    stopLossAdjustments,
    walletTransactions,
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const backup = await loadBackup(auth.userId);
  const filename = backupFilename(format, new Date(backup.exportedAt));
  const body = format === "csv" ? tradesToImportCsv(backup.trades) : serializeTradeBackup(backup);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":
        format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Backup-Trade-Count": String(backup.trades.length),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "備份格式錯誤" }, { status: 400 });
  }

  const planned = planRestore(body);
  if (!planned.ok) {
    return NextResponse.json({ error: planned.error }, { status: 400 });
  }

  const { plan } = planned;
  const userId = auth.userId;

  try {
    await prisma.$transaction(
      async (tx) => {
        if (plan.commissionDiscount != null) {
          await tx.user.update({
            where: { id: userId },
            data: { commissionDiscount: plan.commissionDiscount },
          });
        }

        for (const trade of plan.trades) {
          await tx.trade.create({
            data: {
              ...trade,
              userId,
            },
          });
        }

        const symbols = [...new Set(plan.trades.map((trade) => trade.symbol))];
        for (const symbol of symbols) {
          await recomputeSymbolPnL(tx, userId, symbol);
        }

        if (plan.stopLossAdjustments.length > 0) {
          await tx.stopLossAdjustment.createMany({
            data: plan.stopLossAdjustments.map((row) => ({
              ...row,
              userId,
            })),
          });
        }
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
  } catch (error) {
    console.error("還原交易備份失敗:", error);
    return NextResponse.json({ error: "還原失敗" }, { status: 500 });
  }

  return NextResponse.json({
    imported: plan.trades.length,
    stopLossAdjustments: plan.stopLossAdjustments.length,
    commissionDiscount: plan.commissionDiscount,
    walletTransactionsIgnored: plan.ignoredWalletTransactions,
  });
}
