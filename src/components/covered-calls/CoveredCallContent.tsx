"use client";

import { useEffect, useState } from "react";
import { Layers, AlertTriangle } from "lucide-react";
import { NewPositionForm } from "./NewPositionForm";
import { PositionCard } from "./PositionCard";
import { useCoveredCallStore } from "@/store/useCoveredCallStore";
import { summarizeAll } from "@/lib/covered-call";
import { cn, formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Currency } from "@/types/taiwan";

type Filter = "ALL" | "OPEN" | "CLOSED";

const FILTERS: { key: Filter; labelKey: string }[] = [
  { key: "OPEN", labelKey: "coveredCalls.filterOpen" },
  { key: "CLOSED", labelKey: "coveredCalls.filterClosed" },
  { key: "ALL", labelKey: "coveredCalls.filterAll" },
];

/** 總覽的一格數字 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-mono text-base font-semibold">{value}</p>
    </div>
  );
}

export function CoveredCallContent() {
  const { t } = useT();
  const positions = useCoveredCallStore((s) => s.positions);
  const isLoading = useCoveredCallStore((s) => s.isLoading);
  const fetchPositions = useCoveredCallStore((s) => s.fetch);

  const [filter, setFilter] = useState<Filter>("OPEN");

  useEffect(() => {
    fetchPositions(filter);
  }, [fetchPositions, filter]);

  // 切換篩選期間避免顯示上一組的殘留資料
  const visible = positions.filter(
    (p) => filter === "ALL" || p.status === filter,
  );
  const totals = summarizeAll(visible);
  const currencies = Object.keys(totals.byCurrency) as Currency[];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {t("coveredCalls.subtitle")}
        </p>
        <NewPositionForm />
      </div>

      {/* 篩選 */}
      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:bg-accent",
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {/* 總覽 */}
      {visible.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label={t("coveredCalls.openPositions")}
              value={String(totals.openPositionCount)}
            />
            <Stat
              label={t("coveredCalls.openLegs")}
              value={String(totals.openLegCount)}
            />
            <Stat
              label={t("coveredCalls.expiringSoon")}
              value={String(totals.expiringSoonCount)}
            />
            <Stat
              label={t("coveredCalls.totalPremium")}
              value={currencies
                .map((c) =>
                  formatCurrency(totals.byCurrency[c].realizedPremium, c, true),
                )
                .join(" / ")}
            />
          </div>

          {currencies.map((c) => (
            <div
              key={c}
              className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border bg-card px-3 py-2 text-xs"
            >
              <span className="font-medium">{c}</span>
              <span className="text-muted-foreground">
                {t("coveredCalls.cost")}{" "}
                <span className="font-mono text-foreground">
                  {formatCurrency(totals.byCurrency[c].longCost, c)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t("coveredCalls.unrealizedPremium")}{" "}
                <span className="font-mono text-foreground">
                  {formatCurrency(totals.byCurrency[c].openPremiumCredit, c)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t("coveredCalls.netRealized")}{" "}
                <span
                  className={cn(
                    "font-mono",
                    totals.byCurrency[c].netRealizedPnL >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatCurrency(totals.byCurrency[c].netRealizedPnL, c, true)}
                </span>
              </span>
            </div>
          ))}

          {totals.overWrittenCount > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {t("coveredCalls.overWrittenWarning", {
                count: totals.overWrittenCount,
              })}
            </p>
          )}
        </div>
      )}

      {/* 底倉列表 */}
      {isLoading && visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : visible.length === 0 ? (
        <div className="space-y-3 rounded-lg border bg-card p-10 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filter === "CLOSED"
              ? t("coveredCalls.emptyClosed")
              : t("coveredCalls.empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((position) => (
            <PositionCard key={position.id} position={position} />
          ))}
        </div>
      )}
    </div>
  );
}
