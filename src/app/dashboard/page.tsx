import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { computePnLSummary, getDailyPnL } from "@/lib/pnl-calculator";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [summary, dailyPnL, recentTrades] = await Promise.all([
    computePnLSummary(userId),
    getDailyPnL(userId),
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
