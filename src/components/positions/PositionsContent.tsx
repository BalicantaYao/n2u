"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { PositionsTable } from "@/components/positions/PositionsTable";
import { MarketTabs } from "@/components/common/MarketTabs";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPct, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Banknote,
  Percent,
  RefreshCw,
  BellRing,
} from "lucide-react";
import type { Position } from "@/types/trade";
import type { Currency } from "@/types/taiwan";

interface PositionsContentProps {
  positions: Position[];
}

export function PositionsContent({ positions }: PositionsContentProps) {
  const { t } = useT();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const twPositions = positions.filter((p) => p.currency !== "USD");
  const usPositions = positions.filter((p) => p.currency === "USD");

  return (
    <div>
      <Header titleKey="positions.title" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
            />
            {t("positions.refresh")}
          </Button>
        </div>

        <MarketTabs
          tw={<CurrencySection currency="TWD" positions={twPositions} />}
          us={<CurrencySection currency="USD" positions={usPositions} />}
        />
      </div>
    </div>
  );
}

function CurrencySection({
  currency,
  positions,
}: {
  currency: Currency;
  positions: Position[];
}) {
  const { t } = useT();
  const totalCost = positions.reduce((s, p) => s + p.totalCost, 0);
  const totalMarketValue = positions.reduce(
    (s, p) => s + (p.marketValue ?? p.totalCost),
    0,
  );
  const totalUnrealized = positions.reduce(
    (s, p) => s + (p.unrealizedPnL ?? 0),
    0,
  );
  const totalDailyChange = positions.reduce(
    (s, p) => s + (p.dailyChange != null ? p.dailyChange * p.totalShares : 0),
    0,
  );
  const overallReturn = totalCost > 0 ? totalUnrealized / totalCost : 0;
  const hasQuotes = positions.some((p) => p.currentPrice != null);

  // 台股賣到只剩 1 股、或美股投入成本 < 1 元，屬「觀察股」留倉部位
  const isWatchLot = (p: Position) =>
    currency === "USD" ? p.totalCost < 1 : p.totalShares === 1;
  const watchPositions = positions.filter(isWatchLot);
  const mainPositions = positions.filter((p) => !isWatchLot(p));

  // 超過 3 天未調整停損的個股，提醒檢視
  const stopLossReviewPositions = mainPositions.filter(
    (p) => p.needsStopLossReview,
  );

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title={t("positions.positionCount")}
          value={`${mainPositions.length} ${t("positions.positionUnit")}`}
          icon={Briefcase}
          trend="neutral"
        />
        <StatCard
          title={t("positions.totalCost")}
          value={formatCurrency(totalCost, currency)}
          icon={Banknote}
          trend="neutral"
        />
        <StatCard
          title={t("positions.marketValue")}
          value={hasQuotes ? formatCurrency(totalMarketValue, currency) : "—"}
          icon={TrendingUp}
          trend="neutral"
        />
        <StatCard
          title={t("positions.dailyPnL")}
          value={
            hasQuotes ? formatCurrency(totalDailyChange, currency, true) : "—"
          }
          icon={totalDailyChange >= 0 ? TrendingUp : TrendingDown}
          trend={
            !hasQuotes
              ? "neutral"
              : totalDailyChange > 0
                ? "positive"
                : totalDailyChange < 0
                  ? "negative"
                  : "neutral"
          }
        />
        <StatCard
          title={t("positions.unrealizedPnL")}
          value={
            hasQuotes ? formatCurrency(totalUnrealized, currency, true) : "—"
          }
          icon={totalUnrealized >= 0 ? TrendingUp : TrendingDown}
          trend={
            !hasQuotes
              ? "neutral"
              : totalUnrealized > 0
                ? "positive"
                : totalUnrealized < 0
                  ? "negative"
                  : "neutral"
          }
        />
        <StatCard
          title={t("positions.overallReturn")}
          value={hasQuotes ? formatPct(overallReturn) : "—"}
          icon={Percent}
          trend={
            !hasQuotes
              ? "neutral"
              : overallReturn > 0
                ? "positive"
                : overallReturn < 0
                  ? "negative"
                  : "neutral"
          }
        />
      </div>

      {stopLossReviewPositions.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
          <BellRing className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {t("positions.stopLossReviewReminderTitle")}
            </p>
            <p className="text-amber-700 dark:text-amber-400/90">
              {t("positions.stopLossReviewReminderDesc")}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {stopLossReviewPositions.map((p) => (
                <span
                  key={p.symbol}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                  title={t("positions.stopLossReviewBadge", {
                    days: p.daysSinceStopLossUpdate ?? 0,
                  })}
                >
                  {p.symbol}
                  {p.daysSinceStopLossUpdate != null && (
                    <span className="opacity-70">
                      {p.daysSinceStopLossUpdate}
                      {t("positions.daysUnit")}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <PositionsTable
        positions={mainPositions}
        portfolioValue={totalMarketValue}
      />
      {watchPositions.length > 0 && (
        <PositionsTable
          positions={watchPositions}
          titleKey="positions.observationTitle"
          portfolioValue={totalMarketValue}
        />
      )}
    </section>
  );
}
