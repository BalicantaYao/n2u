import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { computePnLSummary, getDailyPnL } from "@/lib/pnl-calculator";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  const [
    summaryTWD,
    dailyPnLTWD,
    summaryUSD,
    dailyPnLUSD,
    recentTrades,
    usTradeCount,
  ] = await Promise.all([
    computePnLSummary(userId, "TWD"),
    getDailyPnL(undefined, undefined, userId, "TWD"),
    computePnLSummary(userId, "USD"),
    getDailyPnL(undefined, undefined, userId, "USD"),
    prisma.trade.findMany({
      where: { userId },
      orderBy: { tradeDate: "desc" },
      take: 10,
    }),
    prisma.trade.count({ where: { userId, currency: "USD" } }),
  ]);

  return (
    <DashboardContent
      summary={summaryTWD}
      dailyPnL={dailyPnLTWD}
      summaryUSD={summaryUSD}
      dailyPnLUSD={dailyPnLUSD}
      hasUSTrades={usTradeCount > 0}
      recentTrades={recentTrades as never}
    />
  );
}
