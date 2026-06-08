"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { ResultsTable, SellTradeList } from "@/components/results/ResultsTable";
import { MarketTabs } from "@/components/common/MarketTabs";
import { formatCurrency } from "@/lib/utils";
import { useObservationStore } from "@/store/useObservationStore";
import { useT } from "@/lib/i18n";
import type { MarketSummary, SymbolResult, TradingResultsData } from "@/types/trade";
import type { Currency } from "@/types/taiwan";

type Tab = "bySymbol" | "byTrade";

export default function ResultsPage() {
  const [data, setData] = useState<TradingResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<Tab>("bySymbol");
  const { t } = useT();
  const fetchObservations = useObservationStore((s) => s.fetch);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/results?${params.toString()}`);
      const json: TradingResultsData = await res.json();
      setData(json);
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 載入目前的每日觀察清單，用於標記已加入的個股。
  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  const twBySymbol = useMemo(
    () => data?.bySymbol.filter((g) => (g.currency ?? "TWD") !== "USD") ?? [],
    [data],
  );
  const usBySymbol = useMemo(
    () => data?.bySymbol.filter((g) => g.currency === "USD") ?? [],
    [data],
  );

  const emptySummary: MarketSummary = {
    totalRealized: 0,
    totalTrades: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    totalCommission: 0,
    totalTransactionTax: 0,
  };
  const twSummary = data?.summaryByCurrency?.TWD ?? emptySummary;
  const usSummary = data?.summaryByCurrency?.USD ?? emptySummary;

  return (
    <div>
      <Header titleKey="results.title" />
      <div className="p-4 md:p-6 space-y-4">

        {/* Date filters (shared across markets) */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="w-36 md:w-40"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-muted-foreground text-sm">{t("common.to")}</span>
          <Input
            type="date"
            className="w-36 md:w-40"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          {(from || to) && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => { setFrom(""); setTo(""); }}
            >
              {t("common.clear")}
            </button>
          )}
        </div>

        <MarketTabs
          tw={
            <ResultsPanel
              currency="TWD"
              summary={twSummary}
              bySymbol={twBySymbol}
              tab={tab}
              setTab={setTab}
              isLoading={isLoading}
              hasData={data != null}
            />
          }
          us={
            <ResultsPanel
              currency="USD"
              summary={usSummary}
              bySymbol={usBySymbol}
              tab={tab}
              setTab={setTab}
              isLoading={isLoading}
              hasData={data != null}
            />
          }
        />
      </div>
    </div>
  );
}

interface ResultsPanelProps {
  currency: Currency;
  summary: MarketSummary;
  bySymbol: SymbolResult[];
  tab: Tab;
  setTab: (tab: Tab) => void;
  isLoading: boolean;
  hasData: boolean;
}

function ResultsPanel({
  currency,
  summary,
  bySymbol,
  tab,
  setTab,
  isLoading,
  hasData,
}: ResultsPanelProps) {
  const { t } = useT();

  const profitFactor =
    summary.lossCount > 0
      ? (summary.winCount / summary.lossCount).toFixed(2)
      : summary.winCount
      ? "∞"
      : "—";

  const pnlColor =
    summary.totalRealized > 0
      ? "text-green-600 dark:text-green-400"
      : summary.totalRealized < 0
      ? "text-red-600 dark:text-red-400"
      : "";

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/30 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t("results.realizedPnL")}</span>
          <span className={`font-semibold tabular-nums ${pnlColor}`}>
            {formatCurrency(summary.totalRealized, currency, true)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("results.tradeCount")}</span>
          <span className="font-semibold">{summary.totalTrades}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("results.winRate")}</span>
          <span className="font-semibold">
            {summary.totalTrades > 0
              ? `${(summary.winRate * 100).toFixed(1)}%`
              : "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("results.winLossRatio")}</span>
          <span className="font-semibold">
            <span className="text-green-600 dark:text-green-400">{t("results.winCount", { count: summary.winCount })}</span>
            <span className="text-muted-foreground mx-0.5">/</span>
            <span className="text-red-600 dark:text-red-400">{t("results.lossCount", { count: summary.lossCount })}</span>
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("results.profitLossRatio")}</span>
          <span className="font-semibold">{profitFactor}</span>
        </div>
        <div className="hidden sm:block">
          <span className="text-muted-foreground">{t("results.commission")}</span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(
              summary.totalCommission + summary.totalTransactionTax,
              currency,
            )}
          </span>
        </div>
      </div>

      {/* bySymbol / byTrade tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab("bySymbol")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "bySymbol"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("results.bySymbol")}
        </button>
        <button
          onClick={() => setTab("byTrade")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "byTrade"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("results.byTrade")}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">{t("common.loading")}</div>
        ) : hasData ? (
          tab === "bySymbol" ? (
            <ResultsTable bySymbol={bySymbol} />
          ) : (
            <SellTradeList bySymbol={bySymbol} />
          )
        ) : null}
      </div>
    </div>
  );
}
