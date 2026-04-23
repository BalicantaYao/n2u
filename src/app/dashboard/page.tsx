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
    recentTradesTWD,
    recentTradesUSD,
  ] = await Promise.all([
    computePnLSummary(userId, "TWD"),
    getDailyPnL(undefined, undefined, userId, "TWD"),
    computePnLSummary(userId, "USD"),
    getDailyPnL(undefined, undefined, userId, "USD"),
    prisma.trade.findMany({
      where: { userId, currency: "TWD" },
      orderBy: { tradeDate: "desc" },
      take: 10,
    }),
    prisma.trade.findMany({
      where: { userId, currency: "USD" },
      orderBy: { tradeDate: "desc" },
      take: 10,
    }),
  ]);

  return (
    <DashboardContent
      summaryTWD={summaryTWD}
      dailyPnLTWD={dailyPnLTWD}
      summaryUSD={summaryUSD}
      dailyPnLUSD={dailyPnLUSD}
      recentTradesTWD={recentTradesTWD as never}
      recentTradesUSD={recentTradesUSD as never}
    />
  );
}
