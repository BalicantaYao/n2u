"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { PositionsTable } from "@/components/positions/PositionsTable";
import { formatTWD, formatPct, isMarketOpen } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Banknote,
  Percent,
} from "lucide-react";
import type { Position } from "@/types/trade";

interface PositionsContentProps {
  positions: Position[];
  totalCost: number;
  totalMarketValue: number;
  totalUnrealized: number;
  overallReturn: number;
  hasQuotes: boolean;
}

export function PositionsContent({
  positions,
  totalCost,
  totalMarketValue,
  totalUnrealized,
  overallReturn,
  hasQuotes,
}: PositionsContentProps) {
  const { t } = useT();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let currentMs = isMarketOpen() ? 30_000 : 300_000;
    intervalRef.current = setInterval(() => {
      router.refresh();
      const newMs = isMarketOpen() ? 30_000 : 300_000;
      if (newMs !== currentMs) {
        currentMs = newMs;
        scheduleRefresh();
      }
    }, currentMs);
  }, [router]);

  useEffect(() => {
    scheduleRefresh();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scheduleRefresh]);

  return (
    <div>
      <Header titleKey="positions.title" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title={t("positions.positionCount")}
            value={`${positions.length} ${t("positions.positionUnit")}`}
            icon={Briefcase}
            trend="neutral"
          />
          <StatCard
            title={t("positions.totalCost")}
            value={formatTWD(totalCost)}
            icon={Banknote}
            trend="neutral"
          />
          <StatCard
            title={t("positions.marketValue")}
            value={hasQuotes ? formatTWD(totalMarketValue) : "—"}
            icon={TrendingUp}
            trend="neutral"
          />
          <StatCard
            title={t("positions.unrealizedPnL")}
            value={hasQuotes ? formatTWD(totalUnrealized, true) : "—"}
            icon={totalUnrealized >= 0 ? TrendingUp : TrendingDown}
            trend={
              !hasQuotes ? "neutral" : totalUnrealized > 0 ? "positive" : totalUnrealized < 0 ? "negative" : "neutral"
            }
          />
          <StatCard
            title={t("positions.overallReturn")}
            value={hasQuotes ? formatPct(overallReturn) : "—"}
            icon={Percent}
            trend={
              !hasQuotes ? "neutral" : overallReturn > 0 ? "positive" : overallReturn < 0 ? "negative" : "neutral"
            }
          />
        </div>

        {/* Positions Table */}
        <PositionsTable positions={positions} />
      </div>
    </div>
  );
}
