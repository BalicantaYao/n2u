"use client";

import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { PnLChart } from "@/components/dashboard/PnLChart";
import { DailyPnLBar } from "@/components/dashboard/DailyPnLBar";
import { WinLossDonut } from "@/components/dashboard/WinLossDonut";
import { RecentTrades } from "@/components/dashboard/RecentTrades";
import { MarketTabs } from "@/components/common/MarketTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  BarChart2,
  BookOpen,
  Banknote,
} from "lucide-react";
import type { DailyPnL } from "@/types/trade";
import type { Trade } from "@/types/trade";
import type { Currency } from "@/types/taiwan";

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
  summaryTWD: PnLSummary;
  dailyPnLTWD: DailyPnL[];
  summaryUSD: PnLSummary;
  dailyPnLUSD: DailyPnL[];
  recentTradesTWD: Trade[];
  recentTradesUSD: Trade[];
}

export function DashboardContent({
  summaryTWD,
  dailyPnLTWD,
  summaryUSD,
  dailyPnLUSD,
  recentTradesTWD,
  recentTradesUSD,
}: DashboardContentProps) {
  return (
    <div>
      <Header titleKey="dashboard.title" />
      <div className="p-4 md:p-6">
        <MarketTabs
          tw={
            <MarketPanel
              currency="TWD"
              summary={summaryTWD}
              dailyPnL={dailyPnLTWD}
              recentTrades={recentTradesTWD}
            />
          }
          us={
            <MarketPanel
              currency="USD"
              summary={summaryUSD}
              dailyPnL={dailyPnLUSD}
              recentTrades={recentTradesUSD}
            />
          }
        />
      </div>
    </div>
  );
}

function MarketPanel({
  currency,
  summary,
  dailyPnL,
  recentTrades,
}: {
  currency: Currency;
  summary: PnLSummary;
  dailyPnL: DailyPnL[];
  recentTrades: Trade[];
}) {
  const { t } = useT();
  const ev = summary.winRate * summary.avgWin - (1 - summary.winRate) * summary.avgLoss;
  const pfDisplay =
    summary.profitFactor === Infinity ? "∞" : summary.profitFactor.toFixed(2);

  return (
    <section className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title={t("dashboard.totalRealized")}
          value={formatCurrency(summary.totalRealized, currency)}
          trend={summary.totalRealized >= 0 ? "positive" : "negative"}
          icon={summary.totalRealized >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          title={t("dashboard.unrealized")}
          value={formatCurrency(summary.totalUnrealized, currency)}
          trend={summary.totalUnrealized >= 0 ? "positive" : "negative"}
          icon={Banknote}
        />
        <StatCard
          title={t("dashboard.expectedValue")}
          value={formatCurrency(ev, currency, true)}
          sub={
            <div className="space-y-0.5">
              <div>
                {t("dashboard.evUnrealized", {
                  amount: formatCurrency(summary.totalUnrealized, currency, true),
                })}
              </div>
              <div>
                {t("dashboard.evAvgWin", {
                  amount: formatCurrency(summary.avgWin, currency),
                })}
              </div>
              <div>
                {t("dashboard.evAvgLoss", {
                  amount: formatCurrency(summary.avgLoss, currency),
                })}
              </div>
            </div>
          }
          icon={Calculator}
          trend={ev > 0 ? "positive" : ev < 0 ? "negative" : "neutral"}
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
            summary.avgLoss > 0 ? (summary.avgWin / summary.avgLoss).toFixed(2) : "—"
          }
          sub={t("dashboard.avgWinLossSub", {
            avgWin: formatCurrency(summary.avgWin, currency),
            avgLoss: formatCurrency(summary.avgLoss, currency),
          })}
          icon={TrendingUp}
        />
        <StatCard
          title={t("dashboard.totalTrades")}
          value={String(summary.totalTrades)}
          sub={t("dashboard.commissionSub", {
            amount: formatCurrency(summary.totalCommission, currency),
          })}
          icon={BookOpen}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {t("dashboard.cumulativePnL")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PnLChart data={dailyPnL} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {t("dashboard.winLossAnalysis")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WinLossDonut
              winCount={summary.winCount}
              lossCount={summary.lossCount}
            />
          </CardContent>
        </Card>
      </div>

      {/* Daily P&L */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {t("dashboard.dailyPnL30")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyPnLBar data={dailyPnL} currency={currency} />
        </CardContent>
      </Card>

      {/* Recent Trades — 已依當前 Tab 的市場過濾 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {t("dashboard.recentTrades")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <RecentTrades trades={recentTrades as never} />
        </CardContent>
      </Card>
    </section>
  );
}
