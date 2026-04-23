"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { TradeTable } from "@/components/journal/TradeTable";
import { MarketTabs } from "@/components/common/MarketTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTradeStore } from "@/store/useTradeStore";
import { useMarketViewStore } from "@/store/useMarketViewStore";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Plus, Upload } from "lucide-react";
import type { Currency } from "@/types/taiwan";
import type { Trade } from "@/types/trade";

export default function JournalPage() {
  const { trades, isLoading, fetchTrades, deleteTrade, filters, setFilters } =
    useTradeStore();
  const tab = useMarketViewStore((s) => s.tab);
  const { t } = useT();

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades, filters]);

  async function handleDelete(id: string) {
    await deleteTrade(id);
    toast.success(t("journal.deleted"));
  }

  const twTrades = useMemo(
    () => trades.filter((tr) => (tr.currency ?? "TWD") !== "USD"),
    [trades],
  );
  const usTrades = useMemo(
    () => trades.filter((tr) => tr.currency === "USD"),
    [trades],
  );

  return (
    <div>
      <Header titleKey="journal.title" />
      <div className="p-4 md:p-6 space-y-4">
        {/* Top action bar (shared across tabs) */}
        <div className="flex gap-2 justify-end">
          <Link href="/journal/import">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t("journal.importCsv")}</span>
              <span className="sm:hidden">{t("journal.importShort")}</span>
            </Button>
          </Link>
          <Link href="/journal/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              {t("journal.addTrade")}
            </Button>
          </Link>
        </div>

        <MarketTabs
          tw={
            <JournalPanel
              currency="TWD"
              trades={twTrades}
              isLoading={isLoading}
              filters={filters}
              setFilters={setFilters}
              onDelete={handleDelete}
              active={tab === "TW"}
            />
          }
          us={
            <JournalPanel
              currency="USD"
              trades={usTrades}
              isLoading={isLoading}
              filters={filters}
              setFilters={setFilters}
              onDelete={handleDelete}
              active={tab === "US"}
            />
          }
        />
      </div>
    </div>
  );
}

interface JournalPanelProps {
  currency: Currency;
  trades: Trade[];
  isLoading: boolean;
  filters: ReturnType<typeof useTradeStore.getState>["filters"];
  setFilters: ReturnType<typeof useTradeStore.getState>["setFilters"];
  onDelete: (id: string) => void;
  active: boolean;
}

function JournalPanel({
  currency,
  trades,
  isLoading,
  filters,
  setFilters,
  onDelete,
}: JournalPanelProps) {
  const { t } = useT();

  const sellTrades = trades.filter(
    (tr) => tr.side === "SELL" && tr.realizedPnL != null,
  );
  const wins = sellTrades.filter((tr) => (tr.realizedPnL ?? 0) > 0).length;
  const realizedPnL = sellTrades.reduce(
    (sum, tr) => sum + (tr.realizedPnL ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Stats bar — 顯示當前市場 */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/30 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {t("journal.totalRealizedPnL")}
          </span>
          <span
            className={`font-semibold tabular-nums ${realizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {formatCurrency(realizedPnL, currency, true)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("journal.tradeCount")}</span>
          <span className="font-semibold">{trades.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t("journal.winRate")}</span>
          <span className="font-semibold">
            {sellTrades.length > 0
              ? `${((wins / sellTrades.length) * 100).toFixed(1)}%`
              : "—"}
          </span>
        </div>
      </div>

      {/* Filters (除了已被 Tab 取代的市場下拉) */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("journal.searchSymbol")}
          className="w-28 md:w-40"
          value={filters.symbol ?? ""}
          onChange={(e) =>
            setFilters({ symbol: e.target.value.toUpperCase() || undefined })
          }
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={filters.side ?? ""}
          onChange={(e) => setFilters({ side: e.target.value || undefined })}
        >
          <option value="">{t("journal.buySellDirection")}</option>
          <option value="BUY">{t("common.buy")}</option>
          <option value="SELL">{t("common.sell")}</option>
        </select>
        <Input
          type="date"
          className="w-36 md:w-40"
          value={filters.from ?? ""}
          onChange={(e) => setFilters({ from: e.target.value || undefined })}
        />
        <span className="text-muted-foreground text-sm">{t("common.to")}</span>
        <Input
          type="date"
          className="w-36 md:w-40"
          value={filters.to ?? ""}
          onChange={(e) => setFilters({ to: e.target.value || undefined })}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {t("common.loading")}
          </div>
        ) : (
          <TradeTable trades={trades} onDelete={onDelete} />
        )}
      </div>
    </div>
  );
}
