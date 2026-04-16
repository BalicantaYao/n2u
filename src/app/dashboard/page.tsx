import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { computePnLSummary, getDailyPnL } from "@/lib/pnl-calculator";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, dailyPnL, recentTrades] = await Promise.all([
    computePnLSummary(),
    getDailyPnL(),
    prisma.trade.findMany({
      orderBy: { tradeDate: "desc" },
      take: 10,
    }),
  ]);

  return (
    <DashboardContent
      summary={summary}
      dailyPnL={dailyPnL}
      recentTrades={recentTrades as never}
    />
  );
}
