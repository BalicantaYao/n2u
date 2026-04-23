"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { PositionsTable } from "@/components/positions/PositionsTable";
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

        {twPositions.length > 0 && (
          <CurrencySection
            title={t("common.twseFull") + " + " + t("common.tpexFull")}
            currency="TWD"
            positions={twPositions}
          />
        )}

        {usPositions.length > 0 && (
          <CurrencySection
            title="NYSE + NASDAQ"
            currency="USD"
            positions={usPositions}
          />
        )}

        {positions.length === 0 && (
          <PositionsTable positions={[]} />
        )}
      </div>
    </div>
  );
}

function CurrencySection({
  title,
  currency,
  positions,
}: {
  title: string;
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

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title={t("positions.positionCount")}
          value={`${positions.length} ${t("positions.positionUnit")}`}
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

      <PositionsTable positions={positions} />
    </section>
  );
}
