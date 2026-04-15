"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { ResultsTable, SellTradeList } from "@/components/results/ResultsTable";
import { formatTWD } from "@/lib/utils";
import type { TradingResultsData } from "@/types/trade";

type Tab = "bySymbol" | "byTrade";

export default function ResultsPage() {
  const [data, setData] = useState<TradingResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<Tab>("bySymbol");

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

  const summary = data?.summary;
  const profitFactor =
    summary && summary.lossCount > 0
      ? (summary.winCount / summary.lossCount).toFixed(2)
      : summary?.winCount
      ? "∞"
      : "—";

  return (
    <div>
      <Header title="交易成果" />
      <div className="p-4 md:p-6 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="w-36 md:w-40"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-muted-foreground text-sm">至</span>
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
              清除
            </button>
          )}
        </div>

        {/* Stats bar */}
        {summary && (
          <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/30 text-sm">
            <div>
              <span className="text-muted-foreground">已實現損益：</span>
              <span
                className={`font-semibold tabular-nums ${
                  summary.totalRealized > 0
                    ? "text-green-600 dark:text-green-400"
                    : summary.totalRealized < 0
                    ? "text-red-600 dark:text-red-400"
                    : ""
                }`}
              >
                {formatTWD(summary.totalRealized, true)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">交易筆數：</span>
              <span className="font-semibold">{summary.totalTrades}</span>
            </div>
            <div>
              <span className="text-muted-foreground">勝率：</span>
              <span className="font-semibold">
                {summary.totalTrades > 0
                  ? `${(summary.winRate * 100).toFixed(1)}%`
                  : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">勝/敗：</span>
              <span className="font-semibold">
                <span className="text-green-600 dark:text-green-400">{summary.winCount}勝</span>
                <span className="text-muted-foreground mx-0.5">/</span>
                <span className="text-red-600 dark:text-red-400">{summary.lossCount}敗</span>
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">盈虧比：</span>
              <span className="font-semibold">{profitFactor}</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-muted-foreground">手續費：</span>
              <span className="font-semibold tabular-nums">
                {formatTWD(summary.totalCommission + summary.totalTransactionTax)}
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab("bySymbol")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "bySymbol"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            個股彙總
          </button>
          <button
            onClick={() => setTab("byTrade")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "byTrade"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            逐筆明細
          </button>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">載入中...</div>
          ) : data ? (
            tab === "bySymbol" ? (
              <ResultsTable bySymbol={data.bySymbol} />
            ) : (
              <SellTradeList bySymbol={data.bySymbol} />
            )
          ) : null}
        </div>

      </div>
    </div>
  );
}
