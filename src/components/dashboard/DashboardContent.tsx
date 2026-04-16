"use client";

import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { PnLChart } from "@/components/dashboard/PnLChart";
import { DailyPnLBar } from "@/components/dashboard/DailyPnLBar";
import { WinLossDonut } from "@/components/dashboard/WinLossDonut";
import { RecentTrades } from "@/components/dashboard/RecentTrades";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTWD } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  BarChart2,
  BookOpen,
  Banknote,
} from "lucide-react";
import type { DailyPnL } from "@/types/trade";
import type { Trade } from "@/types/trade";

interface PnLSummary {
  totalRealized: number;
  totalUnrealized: number;
  winRate: number;
  winCount: number;
  lossCount: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  totalCommission: number;
}

interface DashboardContentProps {
  summary: PnLSummary;
  dailyPnL: DailyPnL[];
  recentTrades: Trade[];
}

export function DashboardContent({ summary, dailyPnL, recentTrades }: DashboardContentProps) {
  const { t } = useT();

  const winRateDisplay = `${(summary.winRate * 100).toFixed(1)}%`;
  const pfDisplay =
    summary.profitFactor === Infinity
      ? "∞"
      : summary.profitFactor.toFixed(2);

  return (
    <div>
      <Header titleKey="dashboard.title" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title={t("dashboard.totalRealized")}
            value={formatTWD(summary.totalRealized)}
            trend={summary.totalRealized >= 0 ? "positive" : "negative"}
            icon={summary.totalRealized >= 0 ? TrendingUp : TrendingDown}
          />
          <StatCard
            title={t("dashboard.unrealized")}
            value={formatTWD(summary.totalUnrealized)}
            trend={summary.totalUnrealized >= 0 ? "positive" : "negative"}
            icon={Banknote}
          />
          <StatCard
            title={t("dashboard.winRate")}
            value={winRateDisplay}
            sub={t("dashboard.winLoss", { win: summary.winCount, loss: summary.lossCount })}
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
            title={t("dashboard.profitFactor")}
            value={pfDisplay}
            sub={t("dashboard.profitFactorSub")}
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
            title={t("dashboard.avgWinLossRatio")}
            value={
              summary.avgLoss > 0
                ? (summary.avgWin / summary.avgLoss).toFixed(2)
                : "—"
            }
            sub={t("dashboard.avgWinLossSub", { avgWin: formatTWD(summary.avgWin), avgLoss: formatTWD(summary.avgLoss) })}
            icon={TrendingUp}
          />
          <StatCard
            title={t("dashboard.totalTrades")}
            value={String(summary.totalTrades)}
            sub={t("dashboard.commissionSub", { amount: formatTWD(summary.totalCommission) })}
            icon={BookOpen}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("dashboard.cumulativePnL")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PnLChart data={dailyPnL} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("dashboard.winLossAnalysis")}</CardTitle>
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
              <CardTitle className="text-sm font-semibold">{t("dashboard.dailyPnL30")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyPnLBar data={dailyPnL} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("dashboard.recentTrades")}</CardTitle>
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
