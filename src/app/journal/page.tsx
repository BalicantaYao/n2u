"use client";

import { useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { TradeTable } from "@/components/journal/TradeTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTradeStore } from "@/store/useTradeStore";
import { formatTWD } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Plus, Upload } from "lucide-react";

export default function JournalPage() {
  const { trades, isLoading, fetchTrades, deleteTrade, filters, setFilters } =
    useTradeStore();
  const { t } = useT();

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades, filters]);

  async function handleDelete(id: string) {
    await deleteTrade(id);
    toast.success(t("journal.deleted"));
  }

  // Stats
  const sellTrades = trades.filter((t) => t.side === "SELL" && t.realizedPnL != null);
  const totalPnL = sellTrades.reduce((s, t) => s + (t.realizedPnL ?? 0), 0);
  const wins = sellTrades.filter((t) => (t.realizedPnL ?? 0) > 0).length;

  return (
    <div>
      <Header titleKey="journal.title" />
      <div className="p-4 md:p-6 space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/30 text-sm">
          <div>
            <span className="text-muted-foreground">{t("journal.totalRealizedPnL")}</span>
            <span className={`font-semibold tabular-nums ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatTWD(totalPnL, true)}
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

        {/* Filters + Add button */}
        <div className="space-y-2">
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
              value={filters.market ?? ""}
              onChange={(e) => setFilters({ market: e.target.value || undefined })}
            >
              <option value="">{t("journal.allMarkets")}</option>
              <option value="TWSE">{t("common.twse")}</option>
              <option value="TPEX">{t("common.tpex")}</option>
            </select>
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
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {t("common.loading")}
            </div>
          ) : (
            <TradeTable trades={trades} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
