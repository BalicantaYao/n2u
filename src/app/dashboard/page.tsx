import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { PnLChart } from "@/components/dashboard/PnLChart";
import { DailyPnLBar } from "@/components/dashboard/DailyPnLBar";
import { WinLossDonut } from "@/components/dashboard/WinLossDonut";
import { RecentTrades } from "@/components/dashboard/RecentTrades";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computePnLSummary, getDailyPnL } from "@/lib/pnl-calculator";
import { prisma } from "@/lib/prisma";
import { formatTWD } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  BarChart2,
  BookOpen,
  Banknote,
} from "lucide-react";

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

  const winRateDisplay = `${(summary.winRate * 100).toFixed(1)}%`;
  const pfDisplay =
    summary.profitFactor === Infinity
      ? "∞"
      : summary.profitFactor.toFixed(2);

  return (
    <div>
      <Header title="總覽" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="總已實現損益"
            value={formatTWD(summary.totalRealized)}
            trend={summary.totalRealized >= 0 ? "positive" : "negative"}
            icon={summary.totalRealized >= 0 ? TrendingUp : TrendingDown}
          />
          <StatCard
            title="未實現損益"
            value={formatTWD(summary.totalUnrealized)}
            trend={summary.totalUnrealized >= 0 ? "positive" : "negative"}
            icon={Banknote}
          />
          <StatCard
            title="勝率"
            value={winRateDisplay}
            sub={`${summary.winCount}勝 / ${summary.lossCount}敗`}
            icon={Percent}
            trend={
              summary.winRate >= 0.5
                ? "positive"
                : summary.winRate > 0
                ? "negative"
                : "neutral"
            }
          />
          <StatCard
            title="獲利因子"
            value={pfDisplay}
            sub="總獲利 / 總虧損"
            icon={BarChart2}
            trend={
              summary.profitFactor >= 1.5
                ? "positive"
                : summary.profitFactor >= 1
                ? "neutral"
                : "negative"
            }
          />
          <StatCard
            title="平均盈虧比"
            value={
              summary.avgLoss > 0
                ? (summary.avgWin / summary.avgLoss).toFixed(2)
                : "—"
            }
            sub={`均盈 ${formatTWD(summary.avgWin)} / 均虧 ${formatTWD(summary.avgLoss)}`}
            icon={TrendingUp}
          />
          <StatCard
            title="總交易筆數"
            value={String(summary.totalTrades)}
            sub={`手續費 ${formatTWD(summary.totalCommission)}`}
            icon={BookOpen}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">累計損益</CardTitle>
            </CardHeader>
            <CardContent>
              <PnLChart data={dailyPnL} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">勝敗分析</CardTitle>
            </CardHeader>
            <CardContent>
              <WinLossDonut
                winCount={summary.winCount}
                lossCount={summary.lossCount}
              />
            </CardContent>
          </Card>
        </div>

        {/* Daily PnL + Recent Trades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">近 30 日每日損益</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyPnLBar data={dailyPnL} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">最近交易</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <RecentTrades trades={recentTrades as never} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
