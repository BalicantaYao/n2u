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
import { Plus } from "lucide-react";

export default function JournalPage() {
  const { trades, isLoading, fetchTrades, deleteTrade, filters, setFilters } =
    useTradeStore();

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades, filters]);

  async function handleDelete(id: string) {
    await deleteTrade(id);
    toast.success("交易記錄已刪除");
  }

  // Stats
  const sellTrades = trades.filter((t) => t.side === "SELL" && t.realizedPnL != null);
  const totalPnL = sellTrades.reduce((s, t) => s + (t.realizedPnL ?? 0), 0);
  const wins = sellTrades.filter((t) => (t.realizedPnL ?? 0) > 0).length;

  return (
    <div>
      <Header title="交易日誌" />
      <div className="p-6 space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/30 text-sm">
          <div>
            <span className="text-muted-foreground">總已實現損益：</span>
            <span className={`font-semibold tabular-nums ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatTWD(totalPnL, true)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">交易筆數：</span>
            <span className="font-semibold">{trades.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">勝率：</span>
            <span className="font-semibold">
              {sellTrades.length > 0
                ? `${((wins / sellTrades.length) * 100).toFixed(1)}%`
                : "—"}
            </span>
          </div>
        </div>

        {/* Filters + Add button */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="搜尋代號..."
            className="max-w-[160px]"
            value={filters.symbol ?? ""}
            onChange={(e) =>
              setFilters({ symbol: e.target.value.toUpperCase() || undefined })
            }
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.market ?? ""}
            onChange={(e) => setFilters({ market: e.target.value || undefined })}
          >
            <option value="">全部市場</option>
            <option value="TWSE">上市 (TWSE)</option>
            <option value="TPEX">上櫃 (TPEX)</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.side ?? ""}
            onChange={(e) => setFilters({ side: e.target.value || undefined })}
          >
            <option value="">買賣方向</option>
            <option value="BUY">買進</option>
            <option value="SELL">賣出</option>
          </select>
          <Input
            type="date"
            className="max-w-[160px]"
            value={filters.from ?? ""}
            onChange={(e) => setFilters({ from: e.target.value || undefined })}
          />
          <span className="text-muted-foreground text-sm">至</span>
          <Input
            type="date"
            className="max-w-[160px]"
            value={filters.to ?? ""}
            onChange={(e) => setFilters({ to: e.target.value || undefined })}
          />

          <div className="ml-auto">
            <Link href="/journal/new">
              <Button>
                <Plus className="h-4 w-4 mr-1.5" />
                新增交易
              </Button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              載入中...
            </div>
          ) : (
            <TradeTable trades={trades} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
