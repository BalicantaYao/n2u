"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { OptionTable } from "@/components/options/OptionTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOptionStore } from "@/store/useOptionStore";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { groupOptionTrades } from "@/types/option";
import { Plus } from "lucide-react";

export default function OptionsPage() {
  const {
    options,
    isLoading,
    fetchOptions,
    deleteOption,
    filters,
    setFilters,
  } = useOptionStore();
  const { t } = useT();

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions, filters]);

  async function handleDelete(id: string) {
    await deleteOption(id);
    toast.success(t("options.deleted"));
  }

  const stats = useMemo(() => {
    const groups = groupOptionTrades(options);
    let realized = 0;
    let openPremium = 0;
    let openContracts = 0;
    let closedWins = 0;
    let closedGroups = 0;
    for (const g of groups) {
      if (g.isAllClosed) {
        realized += g.netPremium;
        closedGroups += 1;
        if (g.netPremium > 0) closedWins += 1;
      } else {
        openPremium += g.netPremium;
        openContracts += g.rows
          .filter((r) => r.status === "OPEN")
          .reduce((s, r) => s + r.quantity, 0);
      }
    }
    const winRate = closedGroups > 0 ? (closedWins / closedGroups) * 100 : null;
    return { realized, openPremium, openContracts, winRate };
  }, [options]);

  return (
    <div>
      <Header titleKey="options.title" />
      <div className="p-4 md:p-6 space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/30 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {t("options.totalRealized")}
            </span>
            <span
              className={`font-semibold tabular-nums ${stats.realized >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(stats.realized, "USD", true)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {t("options.openPremium")}
            </span>
            <span
              className={`font-semibold tabular-nums ${stats.openPremium >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(stats.openPremium, "USD", true)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">
              {t("options.openContracts")}
            </span>
            <span className="font-semibold">{stats.openContracts}</span>
          </div>
          <div>
            <span className="text-muted-foreground">
              {t("options.winRate")}
            </span>
            <span className="font-semibold">
              {stats.winRate != null ? `${stats.winRate.toFixed(1)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Filters + Add */}
        <div className="space-y-2">
          <div className="flex gap-2 justify-end">
            <Link href="/options/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                {t("options.addOption")}
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder={t("options.searchSymbol")}
              className="w-28 md:w-40"
              value={filters.symbol ?? ""}
              onChange={(e) =>
                setFilters({
                  symbol: e.target.value.toUpperCase() || undefined,
                })
              }
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={filters.action ?? ""}
              onChange={(e) =>
                setFilters({ action: e.target.value || undefined })
              }
            >
              <option value="">{t("options.allActions")}</option>
              <option value="SELL_PUT">{t("options.sellPut")}</option>
              <option value="BUY_PUT">{t("options.buyPut")}</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters({ status: e.target.value || undefined })
              }
            >
              <option value="">{t("options.allStatus")}</option>
              <option value="OPEN">{t("options.open")}</option>
              <option value="CLOSED">{t("options.closed")}</option>
            </select>
            <Input
              type="date"
              className="w-36 md:w-40"
              value={filters.from ?? ""}
              onChange={(e) =>
                setFilters({ from: e.target.value || undefined })
              }
            />
            <span className="text-muted-foreground text-sm">
              {t("common.to")}
            </span>
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
            <OptionTable options={options} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
