"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LegRow } from "./LegRow";
import { SellCallForm } from "./SellCallForm";
import { NumberField, DateField, toNumber } from "./fields";
import { useCoveredCallStore } from "@/store/useCoveredCallStore";
import { summarizePosition, formatDateOnly, daysUntil } from "@/lib/covered-call";
import { cn, formatCurrency, formatPct, getTodayTW, tradingViewUrl } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { CoveredCallLeg, CoveredCallPosition } from "@/types/covered-call";

/** 一格數據：標籤在上、數值在下 */
function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "profit" | "loss";
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "truncate font-mono text-sm font-medium",
          tone === "profit" && "text-green-600 dark:text-green-400",
          tone === "loss" && "text-red-600 dark:text-red-400",
        )}
        title={hint}
      >
        {value}
      </p>
    </div>
  );
}

export function PositionCard({ position }: { position: CoveredCallPosition }) {
  const { t } = useT();
  const update = useCoveredCallStore((s) => s.update);
  const remove = useCoveredCallStore((s) => s.remove);

  const [expanded, setExpanded] = useState(position.status === "OPEN");
  const [selling, setSelling] = useState(false);
  const [rollFrom, setRollFrom] = useState<CoveredCallLeg | null>(null);
  const [closingPosition, setClosingPosition] = useState(false);
  const [busy, setBusy] = useState(false);

  const [closeDate, setCloseDate] = useState(getTodayTW());
  const [closePrice, setClosePrice] = useState("");
  const [closeFee, setCloseFee] = useState("");

  const s = summarizePosition(position);
  const { currency } = position;
  const isOpen = position.status === "OPEN";
  const isLongCall = position.underlyingType === "LONG_CALL";
  const unit = isLongCall
    ? t("coveredCalls.quantityUnitContracts")
    : t("coveredCalls.quantityUnitLots");
  const longDays = daysUntil(position.expiry);
  const remainingContracts = position.quantity - s.openContracts;

  async function run(fn: () => Promise<unknown>, failKey: string) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t(failKey));
    } finally {
      setBusy(false);
    }
  }

  async function handleClosePosition() {
    await run(async () => {
      await update(position.id, {
        closeDate,
        closePrice: toNumber(closePrice, 0),
        closeFee: toNumber(closeFee, 0),
      });
      toast.success(t("coveredCalls.saved"));
      setClosingPosition(false);
    }, "coveredCalls.saveFailed");
  }

  async function handleDelete() {
    if (!window.confirm(t("coveredCalls.confirmDeletePosition"))) return;
    await run(() => remove(position.id), "coveredCalls.deleteFailed");
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card",
        !isOpen && "opacity-75",
      )}
    >
      {/* 標題列 */}
      <div className="flex items-start gap-3 p-3 md:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={tradingViewUrl(position.symbol, position.market)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold hover:text-primary hover:underline"
            >
              {position.symbol}
            </a>
            {position.symbolName && (
              <span className="truncate text-xs text-muted-foreground">
                {position.symbolName}
              </span>
            )}
            <Badge variant="outline" className="text-[11px]">
              {isLongCall
                ? t("coveredCalls.typeLongCall")
                : t("coveredCalls.typeStock")}
            </Badge>
            {!isOpen && (
              <Badge variant="secondary" className="text-[11px]">
                {t("coveredCalls.positionClosed")}
              </Badge>
            )}
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {position.quantity} {unit}
            {isLongCall && position.strike != null && ` · ${position.strike} C`}
            {isLongCall && position.expiry && (
              <>
                {" · "}
                {formatDateOnly(position.expiry)}
                {isOpen && longDays != null && (
                  <span
                    className={cn(
                      "ml-1",
                      longDays <= 7 && "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    (
                    {longDays < 0
                      ? t("coveredCalls.expired")
                      : t("coveredCalls.daysToExpiry", { days: longDays })}
                    )
                  </span>
                )}
              </>
            )}
            {" · "}
            {formatDateOnly(position.openDate)} @ {position.openPrice}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={expanded ? t("common.collapse") : t("common.expand")}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 關鍵數據 */}
      <div className="grid grid-cols-2 gap-3 border-t px-3 py-3 sm:grid-cols-3 md:grid-cols-5 md:px-4">
        <Metric
          label={t("coveredCalls.cost")}
          value={formatCurrency(s.longCost, currency)}
        />
        <Metric
          label={t("coveredCalls.totalPremium")}
          value={formatCurrency(s.realizedPremium, currency, true)}
          tone={s.realizedPremium >= 0 ? "profit" : "loss"}
        />
        <Metric
          label={t("coveredCalls.unrealizedPremium")}
          value={formatCurrency(s.openPremiumCredit, currency)}
        />
        <Metric
          label={t("coveredCalls.costRecovery")}
          value={s.costRecoveryPct != null ? formatPct(s.costRecoveryPct, 1) : "—"}
        />
        <Metric
          label={
            isLongCall
              ? t("coveredCalls.breakeven")
              : t("coveredCalls.effectiveCost")
          }
          value={s.breakeven.toFixed(2)}
          hint={t("coveredCalls.effectiveCostHint")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t px-3 py-3 sm:grid-cols-3 md:grid-cols-5 md:px-4">
        <Metric
          label={t("coveredCalls.coverage")}
          value={`${s.openContracts} / ${position.quantity}`}
        />
        <Metric
          label={t("coveredCalls.netRealized")}
          value={formatCurrency(s.netRealizedPnL, currency, true)}
          tone={s.netRealizedPnL >= 0 ? "profit" : "loss"}
        />
        {s.longRealizedPnL != null && (
          <Metric
            label={t("coveredCalls.longPnL")}
            value={formatCurrency(s.longRealizedPnL, currency, true)}
            tone={s.longRealizedPnL >= 0 ? "profit" : "loss"}
          />
        )}
      </div>

      {/* 掩護狀態提示 */}
      {isOpen && (
        <div className="px-3 pb-3 md:px-4">
          {s.isOverWritten ? (
            <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {t("coveredCalls.overWritten")}
            </p>
          ) : remainingContracts > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("coveredCalls.partiallyCovered", { count: remainingContracts })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("coveredCalls.fullyCovered")}
            </p>
          )}
        </div>
      )}

      {position.notes && (
        <p className="whitespace-pre-wrap break-words px-3 pb-3 text-xs text-muted-foreground md:px-4">
          {position.notes}
        </p>
      )}

      {expanded && (
        <div className="space-y-2 border-t px-3 py-3 md:px-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold">
              {t("coveredCalls.legs")}
              <span className="ml-1 font-normal text-muted-foreground">
                {s.closedLegCount}/{s.legCount}
              </span>
            </h3>
            {isOpen && !selling && !rollFrom && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => setSelling(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                {t("coveredCalls.sellCall")}
              </Button>
            )}
          </div>

          {(selling || rollFrom) && (
            <SellCallForm
              positionId={position.id}
              multiplier={position.contractMultiplier}
              currency={currency}
              rollFrom={rollFrom ?? undefined}
              onDone={() => {
                setSelling(false);
                setRollFrom(null);
              }}
            />
          )}

          {position.legs.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {t("coveredCalls.noLegs")}
            </p>
          ) : (
            <div className="space-y-2">
              {position.legs.map((leg) => (
                <LegRow
                  key={leg.id}
                  leg={leg}
                  positionId={position.id}
                  multiplier={position.contractMultiplier}
                  currency={currency}
                  onRoll={(target) => {
                    setSelling(false);
                    setRollFrom(target);
                  }}
                />
              ))}
            </div>
          )}

          {/* 底倉層級操作 */}
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
            {isOpen ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => setClosingPosition((v) => !v)}
              >
                {t("coveredCalls.closePosition")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px]"
                disabled={busy}
                onClick={() =>
                  run(
                    () => update(position.id, { closeDate: null }),
                    "coveredCalls.saveFailed",
                  )
                }
              >
                <Undo2 className="mr-1 h-3 w-3" />
                {t("coveredCalls.reopenPosition")}
              </Button>
            )}
            <button
              type="button"
              title={t("common.delete")}
              aria-label={t("common.delete")}
              disabled={busy}
              onClick={handleDelete}
              className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {closingPosition && (
            <div className="space-y-2 rounded-md border bg-muted/40 p-2.5">
              <div className="grid gap-2 sm:grid-cols-3">
                <DateField
                  label={t("coveredCalls.closeDate")}
                  value={closeDate}
                  onChange={setCloseDate}
                />
                <NumberField
                  label={t("coveredCalls.closePrice")}
                  value={closePrice}
                  onChange={setClosePrice}
                  placeholder="0"
                />
                <NumberField
                  label={t("coveredCalls.closeFee")}
                  value={closeFee}
                  onChange={setCloseFee}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setClosingPosition(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={busy}
                  onClick={handleClosePosition}
                >
                  {t("common.save")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
