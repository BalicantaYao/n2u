import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { computePnLSummary, getDailyPnL } from "@/lib/pnl-calculator";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { userId } = auth;

  const [summary, dailyPnL, recentTrades] = await Promise.all([
    computePnLSummary(userId),
    getDailyPnL(undefined, undefined, userId),
    prisma.trade.findMany({
      where: { userId },
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
